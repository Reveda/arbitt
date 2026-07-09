import crypto from "node:crypto";
import { HTTP_STATUS } from "../../../constants/http";
import { logger } from "../../../config/logger";
import { ApiError } from "../../../utils/ApiError";
import { comparePassword, hashPassword } from "../../../utils/password";
import { toSafeUser } from "../../auth/dtos/auth.dto";
import { authRepository } from "../../auth/repositories/auth.repository";
import { hashToken } from "../../auth/utils/token";
import { emailService } from "../../email/services/email.service";
import { calculateUserRoyaltyRanks } from "../../rewards/services/reward.service";
import type {
  CurrentUserResponseDto,
  UpdateUserResponseDto,
  UserProfileResponseDto,
} from "../dtos/user-response.dto";
import { userRepository } from "../repositories/user.repository";
import {
  requestWalletAddressChangeOtpSchema,
  updateTransactionPasswordSchema,
  updateWalletAddressSchema,
  verifyWalletAddressChangeOtpSchema,
} from "../validations/user.validation";
import type { z } from "zod";

type UpdateWalletAddressInput = z.infer<typeof updateWalletAddressSchema>;
type RequestWalletAddressChangeOtpInput = z.infer<typeof requestWalletAddressChangeOtpSchema>;
type VerifyWalletAddressChangeOtpInput = z.infer<typeof verifyWalletAddressChangeOtpSchema>;
type UpdateTransactionPasswordInput = z.infer<typeof updateTransactionPasswordSchema>;

const WALLET_ADDRESS_CHANGE_OTP_EXPIRES_IN_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

export class UserService {
  async getCurrentUser(userId: string): Promise<CurrentUserResponseDto> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const { userRoyaltyRankMap } = await calculateUserRoyaltyRanks();
    const rankNum = userRoyaltyRankMap.get(userId) ?? 0;
    const rank = rankNum > 0 ? `M${rankNum}` : null;

    return { user: toSafeUser(user, rank) };
  }

  async getUserProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const { userRoyaltyRankMap } = await calculateUserRoyaltyRanks();
    const rankNum = userRoyaltyRankMap.get(userId) ?? 0;
    const rank = rankNum > 0 ? `M${rankNum}` : null;

    return {
      profile: toSafeUser(user, rank),
    };
  }

  async updateWalletAddress(
    userId: string,
    input: UpdateWalletAddressInput,
  ): Promise<UpdateUserResponseDto> {
    const user = await userRepository.updateWalletAddress(userId, input.walletAddress.trim());

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const { userRoyaltyRankMap } = await calculateUserRoyaltyRanks();
    const rankNum = userRoyaltyRankMap.get(userId) ?? 0;
    const rank = rankNum > 0 ? `M${rankNum}` : null;

    return { user: toSafeUser(user, rank) };
  }

  async requestWalletAddressChangeOtp(
    userId: string,
    input: RequestWalletAddressChangeOtpInput,
    meta: RequestMeta,
  ): Promise<{ accepted: boolean; expiresAt?: Date; testMode?: boolean; testOtp?: string }> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    if (user.status === "suspended") {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Your account is suspended.");
    }

    const walletAddress = input.walletAddress.trim();
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + WALLET_ADDRESS_CHANGE_OTP_EXPIRES_IN_MINUTES * 60_000);
    const otpHash = this.hashWalletAddressChangeOtp(user.email, otp);

    await userRepository.setWalletAddressChangeOtp(userId, {
      otpHash,
      expiresAt,
      pendingWalletAddress: walletAddress,
    });
    await emailService.sendOtpEmail({
      to: user.email,
      otp,
      purpose: "wallet-address-change",
      expiresInMinutes: WALLET_ADDRESS_CHANGE_OTP_EXPIRES_IN_MINUTES,
      contextLabel: "Wallet address change",
    });

    this.logDevelopmentOtp("wallet-address-change", user.email, otp, expiresAt);
    await this.recordWalletSecurityEvent({
      action: "user.wallet_address_change_otp_requested",
      email: user.email,
      entityId: userId,
      meta,
    });

    return {
      accepted: true,
      expiresAt,
      ...this.getTestOtpPayload(otp),
    };
  }

  async verifyWalletAddressChangeOtp(
    userId: string,
    input: VerifyWalletAddressChangeOtpInput,
    meta: RequestMeta,
  ): Promise<UpdateUserResponseDto> {
    const user = await userRepository.findByIdWithWalletAddressOtp(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    if (user.status === "suspended") {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Your account is suspended.");
    }

    const pendingWalletAddress = user.pendingWalletAddress?.trim();
    if (!pendingWalletAddress) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "No pending wallet address request found.");
    }

    if (pendingWalletAddress !== input.walletAddress.trim()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Wallet address request has changed. Please request a new OTP.",
      );
    }

    await this.assertValidWalletOtp({
      attempts: user.walletAddressChangeOtpAttempts ?? 0,
      email: user.email,
      expiresAt: user.walletAddressChangeOtpExpiresAt ?? null,
      expectedHash: user.walletAddressChangeOtpHash ?? null,
      inputOtp: input.otp,
      onInvalid: () => userRepository.incrementWalletAddressChangeOtpAttempts(userId),
      userId,
      meta,
    });

    const updatedUser = await userRepository.confirmWalletAddressChange(
      userId,
      pendingWalletAddress,
    );

    if (!updatedUser) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const { userRoyaltyRankMap } = await calculateUserRoyaltyRanks();
    const rankNum = userRoyaltyRankMap.get(userId) ?? 0;
    const rank = rankNum > 0 ? `M${rankNum}` : null;

    await this.recordWalletSecurityEvent({
      action: "user.wallet_address_changed",
      email: user.email,
      entityId: userId,
      meta,
    });

    return { user: toSafeUser(updatedUser, rank) };
  }

  async updateTransactionPassword(
    userId: string,
    input: UpdateTransactionPasswordInput,
  ): Promise<UpdateUserResponseDto> {
    const user = await userRepository.findByIdWithTransactionPassword(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const currentTransactionPassword = input.currentTransactionPassword?.trim();
    const nextTransactionPassword = input.transactionPassword.trim();

    if (user.transactionPasswordHash) {
      if (!currentTransactionPassword) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Current transaction password is required.");
      }

      const passwordMatched = await comparePassword(
        currentTransactionPassword,
        user.transactionPasswordHash,
      );

      if (!passwordMatched) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Current transaction password is incorrect.");
      }
    }

    const transactionPasswordHash = await hashPassword(nextTransactionPassword);
    const updatedUser = await userRepository.updateTransactionPassword(
      userId,
      transactionPasswordHash,
    );

    if (!updatedUser) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const { userRoyaltyRankMap } = await calculateUserRoyaltyRanks();
    const rankNum = userRoyaltyRankMap.get(userId) ?? 0;
    const rank = rankNum > 0 ? `M${rankNum}` : null;

    return { user: toSafeUser(updatedUser, rank) };
  }

  private hashWalletAddressChangeOtp(email: string, otp: string) {
    return hashToken(`wallet-address-change:${email.toLowerCase().trim()}:${otp}`);
  }

  private async assertValidWalletOtp(input: {
    attempts: number;
    email: string;
    expiresAt: Date | string | null;
    expectedHash: string | null;
    inputOtp: string;
    onInvalid: () => Promise<unknown>;
    userId: string;
    meta: RequestMeta;
  }) {
    if (input.attempts >= MAX_OTP_ATTEMPTS) {
      await this.recordWalletSecurityEvent({
        action: "user.wallet_address_change_failed",
        email: input.email,
        entityId: input.userId,
        meta: input.meta,
        reason: "too_many_attempts",
      });
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        "Too many OTP attempts. Request a new OTP.",
      );
    }

    const expiresAtTime = input.expiresAt ? new Date(input.expiresAt).getTime() : 0;
    if (!input.expectedHash || !input.expiresAt || expiresAtTime <= Date.now()) {
      await this.recordWalletSecurityEvent({
        action: "user.wallet_address_change_failed",
        email: input.email,
        entityId: input.userId,
        meta: input.meta,
        reason: "missing_or_expired_otp",
      });
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid or expired OTP.");
    }

    if (
      input.expectedHash !== this.hashWalletAddressChangeOtp(input.email, input.inputOtp.trim())
    ) {
      await input.onInvalid();
      await this.recordWalletSecurityEvent({
        action: "user.wallet_address_change_failed",
        email: input.email,
        entityId: input.userId,
        meta: input.meta,
        reason: "otp_mismatch",
      });
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid or expired OTP.");
    }
  }

  private getTestOtpPayload(otp: string) {
    const productionTestMode =
      process.env.NODE_ENV === "production" && process.env.APP_ENV === "test";
    const nonProductionMode = process.env.NODE_ENV !== "production";

    if (!process.env.EXPOSE_AUTH_OTP_IN_TEST_MODE || (!nonProductionMode && !productionTestMode)) {
      return {};
    }

    return {
      testMode: true,
      testOtp: otp,
    };
  }

  private logDevelopmentOtp(purpose: string, email: string, otp: string, expiresAt: Date) {
    if (process.env.NODE_ENV === "production") {
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

  private async recordWalletSecurityEvent(input: {
    action: string;
    email: string;
    entityId: string;
    meta: RequestMeta;
    reason?: string;
  }) {
    try {
      await authRepository.createAuditLog({
        actorUserId: input.entityId,
        action: input.action,
        entityType: "user",
        entityId: input.entityId,
        metadata: {
          email: input.email,
          ...(input.reason ? { reason: input.reason } : {}),
        },
        ipAddress: input.meta.ipAddress ?? "",
      });
    } catch (error) {
      logger.warn({ action: input.action, error }, "Wallet security audit log failed");
    }
  }
}

export const userService = new UserService();
