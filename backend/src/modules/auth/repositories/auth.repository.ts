import type { HydratedDocument, UpdateWriteOpResult } from "mongoose";
import { AuditLogModel, type AuditLogDocument } from "../../admin/models/audit-log.model";
import { UserModel } from "../../users/models/user.model";
import type { UserDocument } from "../../users/models/user.model";
import type { UserRepositoryRecord } from "../../users/types/user.repository.types";
import { AuthSessionModel, type AuthSessionDocument } from "../models/auth-session.model";
import type { AuthSessionRepositoryRecord } from "../types/auth.repository.types";

type CreateAuthUserInput = {
  email: string;
  passwordHash: string;
  username: string;
  referralCode: string;
  invitedBy: string | null;
};

type CreateSessionInput = {
  userId: string;
  refreshTokenHash: string;
  tokenVersion: number;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
};

type OtpUpdateInput = {
  otpHash: string;
  expiresAt: Date;
};

type AuditLogInput = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
};

type AuthUserDocumentRecord = HydratedDocument<UserDocument>;
type AuthSessionDocumentRecord = HydratedDocument<AuthSessionDocument>;
type AuditLogDocumentRecord = HydratedDocument<AuditLogDocument>;

export class AuthRepository {
  async findUserById(userId: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ _id: userId, isDeleted: { $ne: true } }).lean();
  }

  async findUserByEmail(email: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim(), isDeleted: { $ne: true } }).lean();
  }

  async findUserByUsername(username: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ username: username.toLowerCase().trim(), isDeleted: { $ne: true } }).lean();
  }

  async findUserByReferralCode(referralCode: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ referralCode: referralCode.trim(), isDeleted: { $ne: true } }).lean();
  }

  async findUserByEmailWithPassword(email: string): Promise<AuthUserDocumentRecord | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim(), isDeleted: { $ne: true } }).select("+passwordHash");
  }

  async findUserByEmailWithEmailVerificationOtp(
    email: string,
  ): Promise<AuthUserDocumentRecord | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim(), isDeleted: { $ne: true } }).select(
      "+emailVerificationOtpHash",
    );
  }

  async findUserByEmailWithPasswordResetOtp(email: string): Promise<AuthUserDocumentRecord | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim(), isDeleted: { $ne: true } }).select("+passwordResetOtpHash");
  }

  createUser(input: CreateAuthUserInput): Promise<AuthUserDocumentRecord> {
    return UserModel.create(input);
  }

  async updateLastLogin(userId: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findByIdAndUpdate(userId, { lastLoginAt: new Date() }).lean();
  }

  async setEmailVerificationOtp(
    userId: string,
    input: OtpUpdateInput,
  ): Promise<UserRepositoryRecord | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        emailVerificationOtpHash: input.otpHash,
        emailVerificationOtpExpiresAt: input.expiresAt,
        emailVerificationOtpAttempts: 0,
      },
      { new: true },
    ).lean();
  }

  async incrementEmailVerificationOtpAttempts(
    userId: string,
  ): Promise<UserRepositoryRecord | null> {
    return UserModel.findByIdAndUpdate(userId, {
      $inc: { emailVerificationOtpAttempts: 1 },
    }).lean();
  }

  async markEmailVerified(userId: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        emailVerifiedAt: new Date(),
        emailVerificationOtpHash: null,
        emailVerificationOtpExpiresAt: null,
        emailVerificationOtpAttempts: 0,
        status: "active",
      },
      { new: true },
    ).lean();
  }

  async setPasswordResetOtp(
    userId: string,
    input: OtpUpdateInput,
  ): Promise<UserRepositoryRecord | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        passwordResetOtpHash: input.otpHash,
        passwordResetOtpExpiresAt: input.expiresAt,
        passwordResetOtpAttempts: 0,
      },
      { new: true },
    ).lean();
  }

  async incrementPasswordResetOtpAttempts(userId: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findByIdAndUpdate(userId, {
      $inc: { passwordResetOtpAttempts: 1 },
    }).lean();
  }

  async updatePasswordAndClearResetOtp(
    userId: string,
    passwordHash: string,
  ): Promise<UserRepositoryRecord | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        passwordHash,
        passwordResetOtpHash: null,
        passwordResetOtpExpiresAt: null,
        passwordResetOtpAttempts: 0,
      },
      { new: true },
    ).lean();
  }

  async createSession(input: CreateSessionInput): Promise<AuthSessionRepositoryRecord> {
    const session = await AuthSessionModel.create(input);
    return session.toObject() as AuthSessionRepositoryRecord;
  }

  async findSessionByIdWithToken(sessionId: string): Promise<AuthSessionDocumentRecord | null> {
    return AuthSessionModel.findById(sessionId).select(
      "+refreshTokenHash +previousRefreshTokenHash",
    );
  }

  updateSessionRotation(
    sessionId: string,
    input: {
      previousRefreshTokenHash?: string | null;
      previousTokenRotatedAt?: Date | null;
      previousTokenVersion?: number | null;
      refreshTokenHash: string;
      tokenVersion: number;
      expiresAt: Date;
    },
  ): Promise<AuthSessionRepositoryRecord | null> {
    return AuthSessionModel.findByIdAndUpdate(
      sessionId,
      {
        ...(input.previousRefreshTokenHash !== undefined
          ? { previousRefreshTokenHash: input.previousRefreshTokenHash }
          : {}),
        ...(input.previousTokenRotatedAt !== undefined
          ? { previousTokenRotatedAt: input.previousTokenRotatedAt }
          : {}),
        ...(input.previousTokenVersion !== undefined
          ? { previousTokenVersion: input.previousTokenVersion }
          : {}),
        refreshTokenHash: input.refreshTokenHash,
        tokenVersion: input.tokenVersion,
        expiresAt: input.expiresAt,
        lastUsedAt: new Date(),
      },
      { new: true },
    ).lean();
  }

  rotateSessionRefreshToken(input: {
    sessionId: string;
    currentRefreshTokenHash: string;
    currentTokenVersion: number;
    expiresAt: Date;
    nextRefreshTokenHash: string;
    nextTokenVersion: number;
    rotatedAt: Date;
  }): Promise<AuthSessionRepositoryRecord | null> {
    return AuthSessionModel.findOneAndUpdate(
      {
        _id: input.sessionId,
        refreshTokenHash: input.currentRefreshTokenHash,
        revokedAt: null,
        tokenVersion: input.currentTokenVersion,
      },
      {
        previousRefreshTokenHash: input.currentRefreshTokenHash,
        previousTokenRotatedAt: input.rotatedAt,
        previousTokenVersion: input.currentTokenVersion,
        refreshTokenHash: input.nextRefreshTokenHash,
        tokenVersion: input.nextTokenVersion,
        expiresAt: input.expiresAt,
        lastUsedAt: input.rotatedAt,
      },
      { new: true },
    ).lean();
  }

  async revokeSession(sessionId: string): Promise<AuthSessionRepositoryRecord | null> {
    return AuthSessionModel.findByIdAndUpdate(sessionId, { revokedAt: new Date() }).lean();
  }

  revokeUserSessions(userId: string): Promise<UpdateWriteOpResult> {
    return AuthSessionModel.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
  }

  createAuditLog(input: AuditLogInput): Promise<AuditLogDocumentRecord> {
    return AuditLogModel.create({
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? "",
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress ?? "",
    });
  }
}

export const authRepository = new AuthRepository();
