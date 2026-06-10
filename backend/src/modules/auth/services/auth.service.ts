import crypto from "node:crypto";
import { HTTP_STATUS } from "../../../constants/http";
import { env } from "../../../config/env";
import type { UserRole } from "../../../constants/roles";
import { logger } from "../../../config/logger";
import { ApiError } from "../../../utils/ApiError";
import type { z } from "zod";
import type {
  emailOtpRequestSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validations/auth.validation";
import { comparePassword, hashPassword } from "../../../utils/password";
import { generateReferralCode } from "../../../utils/referralCode";
import { referralRepository } from "../../referrals/repositories/referral.repository";
import { walletRepository } from "../../wallet/repositories/wallet.repository";
import { authRepository } from "../repositories/auth.repository";
import {
  toSafeUser,
  type EmailVerificationRequestResponseDto,
  type ForgotPasswordResponseDto,
  type InternalAuthResponseDto,
  type InternalAuthSessionDto,
  type LogoutResponseDto,
  type ResetPasswordResponseDto,
  type VerifyEmailResponseDto,
} from "../dtos/auth.dto";
import {
  getRefreshTokenExpiry,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/token";

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
type EmailOtpRequestInput = z.infer<typeof emailOtpRequestSchema>;
type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

type AuthRequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

type OtpPurpose = "email-verification" | "password-reset";

type OtpDispatchResult = {
  expiresAt: Date;
  testMode?: boolean;
  testOtp?: string;
};

const OTP_EXPIRES_IN_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const REFRESH_TOKEN_CONCURRENCY_GRACE_MS = 30_000;

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function isWithinRefreshConcurrencyGrace(rotatedAt: Date | string | null | undefined) {
  if (!rotatedAt) {
    return false;
  }

  const rotatedAtTime = new Date(rotatedAt).getTime();

  return (
    !Number.isNaN(rotatedAtTime) && Date.now() - rotatedAtTime <= REFRESH_TOKEN_CONCURRENCY_GRACE_MS
  );
}

function normalizeUsername(username: string) {
  return username.toLowerCase().trim();
}

function getOtpExpiresAt() {
  return new Date(Date.now() + OTP_EXPIRES_IN_MINUTES * 60_000);
}

function getOtpTestFields(result: OtpDispatchResult) {
  return result.testOtp
    ? {
        testMode: true,
        testOtp: result.testOtp,
      }
    : {};
}

export class AuthService {
  async register(input: RegisterInput, meta: AuthRequestMeta): Promise<InternalAuthResponseDto> {
    const email = normalizeEmail(input.email);
    const username = normalizeUsername(input.username);
    const invitationCode = input.invitationCode.trim();

    const [existingEmail, existingUsername, invitedByUser] = await Promise.all([
      authRepository.findUserByEmail(email),
      authRepository.findUserByUsername(username),
      authRepository.findUserByReferralCode(invitationCode),
    ]);

    if (existingEmail) {
      throw new ApiError(HTTP_STATUS.CONFLICT, "Email is already registered.");
    }

    if (existingUsername) {
      throw new ApiError(HTTP_STATUS.CONFLICT, "Username is already taken.");
    }

    if (!invitedByUser) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid invitation code.");
    }

    if (invitedByUser.status === "suspended") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invitation code is not active.");
    }

    const passwordHash = await hashPassword(input.password);
    const referralCode = await this.createUniqueReferralCode();
    const invitedByReferral = await referralRepository.findByUserId(String(invitedByUser._id));
    const referralPath = [
      ...(invitedByReferral?.path?.map((entry) => String(entry)) ?? []),
      String(invitedByUser._id),
    ];

    const user = await authRepository.createUser({
      email,
      passwordHash,
      username,
      referralCode,
      invitedBy: String(invitedByUser._id),
    });
    const userId = String(user._id);

    await Promise.all([
      walletRepository.createDefaultWallet(userId),
      referralRepository.createReferral({
        userId,
        parentUserId: String(invitedByUser._id),
        level: (invitedByReferral?.level ?? 0) + 1,
        path: referralPath,
      }),
      referralRepository.incrementParentStats(String(invitedByUser._id)),
    ]);

    const auth = await this.issueAuthSession(
      {
        id: userId,
        role: user.role,
        status: user.status,
      },
      meta,
    );
    const emailVerification = await this.createEmailVerificationOtp(userId, email);
    await this.recordAuthEvent({
      action: "auth.registered",
      entityId: userId,
      meta,
      metadata: { email, invitedBy: String(invitedByUser._id) },
      userId,
    });

    return {
      user: toSafeUser(user.toObject()),
      auth,
      emailVerification: {
        required: true,
        expiresAt: emailVerification.expiresAt,
        ...getOtpTestFields(emailVerification),
      },
    };
  }

  async login(input: LoginInput, meta: AuthRequestMeta): Promise<InternalAuthResponseDto> {
    const email = normalizeEmail(input.email);
    const user = await authRepository.findUserByEmailWithPassword(email);

    if (!user) {
      await this.recordAuthEvent({
        action: "auth.login_failed",
        meta,
        metadata: { email, reason: "invalid_credentials" },
      });
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid email or password.");
    }

    const passwordMatched = await comparePassword(input.password, user.passwordHash);
    if (!passwordMatched) {
      await this.recordAuthEvent({
        action: "auth.login_failed",
        entityId: String(user._id),
        meta,
        metadata: { email, reason: "invalid_credentials" },
        userId: String(user._id),
      });
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid email or password.");
    }

    if (user.status === "suspended") {
      await this.recordAuthEvent({
        action: "auth.login_failed",
        entityId: String(user._id),
        meta,
        metadata: { email, reason: "suspended" },
        userId: String(user._id),
      });
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Your account is suspended.");
    }

    await authRepository.updateLastLogin(String(user._id));

    const auth = await this.issueAuthSession(
      {
        id: String(user._id),
        role: user.role,
        status: user.status,
      },
      meta,
    );
    const emailVerification = user.emailVerifiedAt
      ? undefined
      : await this.createEmailVerificationOtp(String(user._id), email);
    await this.recordAuthEvent({
      action: "auth.logged_in",
      entityId: String(user._id),
      meta,
      metadata: { email },
      userId: String(user._id),
    });

    return {
      user: toSafeUser(user.toObject()),
      auth,
      ...(emailVerification
        ? {
            emailVerification: {
              required: true,
              expiresAt: emailVerification.expiresAt,
              ...getOtpTestFields(emailVerification),
            },
          }
        : {}),
    };
  }

  async forgotPassword(
    input: ForgotPasswordInput,
    meta: AuthRequestMeta,
  ): Promise<ForgotPasswordResponseDto> {
    const email = normalizeEmail(input.email);
    const user = await authRepository.findUserByEmail(email);

    if (!user || user.status === "suspended") {
      await this.recordAuthEvent({
        action: "auth.password_reset_requested",
        entityId: user ? String(user._id) : email,
        meta,
        metadata: {
          email,
          accepted: false,
          reason: user ? "suspended" : "user_not_found",
        },
        userId: user ? String(user._id) : null,
      });

      return {
        accepted: true,
      };
    }

    const passwordReset = await this.createPasswordResetOtp(String(user._id), email);
    await this.recordAuthEvent({
      action: "auth.password_reset_requested",
      entityId: String(user._id),
      meta,
      metadata: { email, accepted: true },
      userId: String(user._id),
    });

    return {
      accepted: true,
      expiresAt: passwordReset.expiresAt,
    };
  }

  async requestEmailVerificationOtp(
    input: EmailOtpRequestInput,
    meta: AuthRequestMeta,
  ): Promise<EmailVerificationRequestResponseDto> {
    const email = normalizeEmail(input.email);
    const user = await authRepository.findUserByEmail(email);

    if (!user || user.emailVerifiedAt || user.status === "suspended") {
      await this.recordAuthEvent({
        action: "auth.email_verification_otp_requested",
        entityId: user ? String(user._id) : email,
        meta,
        metadata: {
          email,
          accepted: false,
          reason: !user
            ? "user_not_found"
            : user.emailVerifiedAt
              ? "already_verified"
              : "suspended",
        },
        userId: user ? String(user._id) : null,
      });

      return {
        accepted: true,
      };
    }

    const emailVerification = await this.createEmailVerificationOtp(String(user._id), email);
    await this.recordAuthEvent({
      action: "auth.email_verification_otp_requested",
      entityId: String(user._id),
      meta,
      metadata: { email, accepted: true },
      userId: String(user._id),
    });

    return {
      accepted: true,
      expiresAt: emailVerification.expiresAt,
      ...getOtpTestFields(emailVerification),
    };
  }

  async verifyEmail(
    input: VerifyEmailInput,
    meta: AuthRequestMeta,
  ): Promise<VerifyEmailResponseDto> {
    const email = normalizeEmail(input.email);
    const user = await authRepository.findUserByEmailWithEmailVerificationOtp(email);

    if (!user) {
      await this.recordAuthEvent({
        action: "auth.email_verification_failed",
        meta,
        metadata: { email, reason: "user_not_found" },
      });
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid or expired OTP.");
    }

    const userId = String(user._id);

    if (user.status === "suspended") {
      await this.recordAuthEvent({
        action: "auth.email_verification_failed",
        entityId: userId,
        meta,
        metadata: { email, reason: "suspended" },
        userId,
      });
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Your account is suspended.");
    }

    if (user.emailVerifiedAt) {
      return {
        verified: true,
        user: toSafeUser(user.toObject()),
      };
    }

    await this.assertValidOtp({
      attempts: user.emailVerificationOtpAttempts ?? 0,
      email,
      expiresAt: user.emailVerificationOtpExpiresAt ?? null,
      expectedHash: user.emailVerificationOtpHash ?? null,
      inputOtp: input.otp,
      onInvalid: () => authRepository.incrementEmailVerificationOtpAttempts(userId),
      purpose: "email-verification",
      userId,
      meta,
    });

    const verifiedUser = await authRepository.markEmailVerified(userId);

    if (!verifiedUser) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    await this.recordAuthEvent({
      action: "auth.email_verified",
      entityId: userId,
      meta,
      metadata: { email },
      userId,
    });

    return {
      verified: true,
      user: toSafeUser(verifiedUser),
    };
  }

  async resetPassword(
    input: ResetPasswordInput,
    meta: AuthRequestMeta,
  ): Promise<ResetPasswordResponseDto> {
    const email = normalizeEmail(input.email);
    const user = await authRepository.findUserByEmailWithPasswordResetOtp(email);

    if (!user) {
      await this.recordAuthEvent({
        action: "auth.password_reset_failed",
        meta,
        metadata: { email, reason: "user_not_found" },
      });
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid or expired OTP.");
    }

    const userId = String(user._id);

    if (user.status === "suspended") {
      await this.recordAuthEvent({
        action: "auth.password_reset_failed",
        entityId: userId,
        meta,
        metadata: { email, reason: "suspended" },
        userId,
      });
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Your account is suspended.");
    }

    await this.assertValidOtp({
      attempts: user.passwordResetOtpAttempts ?? 0,
      email,
      expiresAt: user.passwordResetOtpExpiresAt ?? null,
      expectedHash: user.passwordResetOtpHash ?? null,
      inputOtp: input.otp,
      onInvalid: () => authRepository.incrementPasswordResetOtpAttempts(userId),
      purpose: "password-reset",
      userId,
      meta,
    });

    const passwordHash = await hashPassword(input.password);
    await authRepository.updatePasswordAndClearResetOtp(userId, passwordHash);
    await authRepository.revokeUserSessions(userId);
    await this.recordAuthEvent({
      action: "auth.password_reset_completed",
      entityId: userId,
      meta,
      metadata: { email },
      userId,
    });

    return {
      reset: true,
    };
  }

  async refreshToken(
    refreshToken: string | undefined,
    _meta: AuthRequestMeta,
  ): Promise<InternalAuthResponseDto> {
    if (!refreshToken) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Refresh token is required.");
    }

    let decoded: ReturnType<typeof verifyRefreshToken>;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid or expired refresh token.");
    }

    if (decoded.type !== "refresh") {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid refresh token.");
    }

    const session = await authRepository.findSessionByIdWithToken(decoded.sessionId);
    if (!session || session.revokedAt) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Refresh session is no longer active.");
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await authRepository.revokeSession(String(session._id));
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Refresh session expired.");
    }

    const incomingRefreshTokenHash = hashToken(refreshToken);
    const currentTokenMatches =
      session.tokenVersion === decoded.tokenVersion &&
      session.refreshTokenHash === incomingRefreshTokenHash;
    const previousTokenMatches =
      session.previousTokenVersion === decoded.tokenVersion &&
      session.previousRefreshTokenHash === incomingRefreshTokenHash &&
      isWithinRefreshConcurrencyGrace(session.previousTokenRotatedAt);

    if (!currentTokenMatches && !previousTokenMatches) {
      await authRepository.revokeSession(String(session._id));
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Refresh token reuse detected.");
    }

    const activeUser = await authRepository.findUserById(decoded.sub);

    if (!activeUser) {
      await authRepository.revokeSession(String(session._id));
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "User no longer exists.");
    }

    if (activeUser.status === "suspended") {
      await authRepository.revokeSession(String(session._id));
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Your account is suspended.");
    }

    const accessToken = signAccessToken({ id: String(activeUser._id), role: activeUser.role });

    if (previousTokenMatches) {
      return {
        user: toSafeUser(activeUser),
        auth: {
          accessToken,
          tokenType: "Bearer",
          accessTokenCookie: true,
          refreshTokenCookie: true,
          rotated: false,
        },
      };
    }

    const nextTokenVersion = session.tokenVersion + 1;
    const nextRefreshToken = signRefreshToken({
      userId: String(activeUser._id),
      role: activeUser.role,
      sessionId: String(session._id),
      tokenVersion: nextTokenVersion,
    });

    const rotatedAt = new Date();
    const rotatedSession = await authRepository.rotateSessionRefreshToken({
      sessionId: String(session._id),
      currentRefreshTokenHash: incomingRefreshTokenHash,
      currentTokenVersion: session.tokenVersion,
      expiresAt: getRefreshTokenExpiry(),
      nextRefreshTokenHash: hashToken(nextRefreshToken),
      nextTokenVersion,
      rotatedAt,
    });

    if (!rotatedSession) {
      const latestSession = await authRepository.findSessionByIdWithToken(decoded.sessionId);
      const latestPreviousTokenMatches =
        latestSession?.previousTokenVersion === decoded.tokenVersion &&
        latestSession.previousRefreshTokenHash === incomingRefreshTokenHash &&
        isWithinRefreshConcurrencyGrace(latestSession.previousTokenRotatedAt);

      if (!latestSession || latestSession.revokedAt || !latestPreviousTokenMatches) {
        await authRepository.revokeSession(String(session._id));
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Refresh token reuse detected.");
      }

      return {
        user: toSafeUser(activeUser),
        auth: {
          accessToken,
          tokenType: "Bearer",
          accessTokenCookie: true,
          refreshTokenCookie: true,
          rotated: false,
        },
      };
    }

    return {
      user: toSafeUser(activeUser),
      auth: {
        accessToken,
        refreshToken: nextRefreshToken,
        tokenType: "Bearer",
        accessTokenCookie: true,
        refreshTokenCookie: true,
        rotated: true,
      },
    };
  }

  async logout(
    refreshToken: string | undefined,
    meta: AuthRequestMeta,
  ): Promise<LogoutResponseDto> {
    if (!refreshToken) {
      await this.recordAuthEvent({
        action: "auth.logged_out",
        meta,
        metadata: { reason: "missing_refresh_token" },
      });
      return { loggedOut: true };
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);
      if (decoded.type === "refresh") {
        await authRepository.revokeSession(decoded.sessionId);
        await this.recordAuthEvent({
          action: "auth.logged_out",
          entityId: decoded.sub,
          meta,
          metadata: { sessionId: decoded.sessionId },
          userId: decoded.sub,
        });
      }
    } catch {
      await this.recordAuthEvent({
        action: "auth.logged_out",
        meta,
        metadata: { reason: "invalid_refresh_token" },
      });
      return { loggedOut: true };
    }

    return { loggedOut: true };
  }

  private async issueAuthSession(
    user: { id: string; role: UserRole; status: string },
    meta: AuthRequestMeta,
  ): Promise<InternalAuthSessionDto> {
    const session = await authRepository.createSession({
      userId: user.id,
      refreshTokenHash: "pending",
      tokenVersion: 1,
      userAgent: meta.userAgent ?? "",
      ipAddress: meta.ipAddress ?? "",
      expiresAt: getRefreshTokenExpiry(),
    });

    const accessToken = signAccessToken({ id: user.id, role: user.role });
    const refreshToken = signRefreshToken({
      userId: user.id,
      role: user.role,
      sessionId: String(session._id),
      tokenVersion: 1,
    });

    await authRepository.updateSessionRotation(String(session._id), {
      previousRefreshTokenHash: null,
      previousTokenRotatedAt: null,
      previousTokenVersion: null,
      refreshTokenHash: hashToken(refreshToken),
      tokenVersion: 1,
      expiresAt: getRefreshTokenExpiry(),
    });

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      accessTokenCookie: true,
      refreshTokenCookie: true,
    };
  }

  private async createEmailVerificationOtp(
    userId: string,
    email: string,
  ): Promise<OtpDispatchResult> {
    const otp = this.createOtp();
    const expiresAt = getOtpExpiresAt();

    await authRepository.setEmailVerificationOtp(userId, {
      otpHash: this.hashOtp("email-verification", email, otp),
      expiresAt,
    });
    this.logDevelopmentOtp("email-verification", email, otp, expiresAt);

    return {
      expiresAt,
      ...this.getTestOtpPayload(otp),
    };
  }

  private async createPasswordResetOtp(userId: string, email: string): Promise<OtpDispatchResult> {
    const otp = this.createOtp();
    const expiresAt = getOtpExpiresAt();

    await authRepository.setPasswordResetOtp(userId, {
      otpHash: this.hashOtp("password-reset", email, otp),
      expiresAt,
    });
    this.logDevelopmentOtp("password-reset", email, otp, expiresAt);

    return {
      expiresAt,
      ...this.getTestOtpPayload(otp),
    };
  }

  private async assertValidOtp(input: {
    attempts: number;
    email: string;
    expiresAt: Date | string | null;
    expectedHash: string | null;
    inputOtp: string;
    onInvalid: () => Promise<unknown>;
    purpose: OtpPurpose;
    userId: string;
    meta: AuthRequestMeta;
  }) {
    const action =
      input.purpose === "email-verification"
        ? "auth.email_verification_failed"
        : "auth.password_reset_failed";

    if (input.attempts >= MAX_OTP_ATTEMPTS) {
      await this.recordAuthEvent({
        action,
        entityId: input.userId,
        meta: input.meta,
        metadata: { email: input.email, reason: "too_many_attempts" },
        userId: input.userId,
      });
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        "Too many OTP attempts. Request a new OTP.",
      );
    }

    const expiresAtTime = input.expiresAt ? new Date(input.expiresAt).getTime() : 0;
    if (!input.expectedHash || !input.expiresAt || expiresAtTime <= Date.now()) {
      await this.recordAuthEvent({
        action,
        entityId: input.userId,
        meta: input.meta,
        metadata: { email: input.email, reason: "missing_or_expired_otp" },
        userId: input.userId,
      });
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid or expired OTP.");
    }

    if (input.expectedHash !== this.hashOtp(input.purpose, input.email, input.inputOtp.trim())) {
      await input.onInvalid();
      await this.recordAuthEvent({
        action,
        entityId: input.userId,
        meta: input.meta,
        metadata: { email: input.email, reason: "otp_mismatch" },
        userId: input.userId,
      });
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid or expired OTP.");
    }
  }

  private createOtp() {
    return crypto.randomInt(100000, 1000000).toString();
  }

  private hashOtp(purpose: OtpPurpose, email: string, otp: string) {
    return hashToken(`${purpose}:${normalizeEmail(email)}:${otp}`);
  }

  private getTestOtpPayload(otp: string) {
    if (env.NODE_ENV === "production" || !env.EXPOSE_AUTH_OTP_IN_TEST_MODE) {
      return {};
    }

    return {
      testMode: true,
      testOtp: otp,
    };
  }

  private logDevelopmentOtp(purpose: OtpPurpose, email: string, otp: string, expiresAt: Date) {
    if (env.NODE_ENV === "production") {
      return;
    }

    logger.info(
      {
        email,
        expiresAt: expiresAt.toISOString(),
        otp,
        purpose,
      },
      "Development OTP generated",
    );
  }

  private async recordAuthEvent(input: {
    action: string;
    entityId?: string;
    meta: AuthRequestMeta;
    metadata?: Record<string, unknown>;
    userId?: string | null;
  }) {
    try {
      await authRepository.createAuditLog({
        actorUserId: input.userId ?? null,
        action: input.action,
        entityType: "auth",
        entityId: input.entityId ?? input.userId ?? "",
        metadata: input.metadata ?? {},
        ipAddress: input.meta.ipAddress ?? "",
      });
    } catch (error) {
      logger.warn({ action: input.action, error }, "Auth audit log failed");
    }
  }

  private async createUniqueReferralCode() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const referralCode = generateReferralCode();
      const existing = await authRepository.findUserByReferralCode(referralCode);
      if (!existing) {
        return referralCode;
      }
    }

    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Could not generate referral code.");
  }
}

export const authService = new AuthService();
