import type { UserRole, UserStatus } from "../../../constants/roles";

type SanitizableUser = {
  _id?: unknown;
  id?: unknown;
  email: string;
  username?: string | null;
  role: UserRole;
  status: UserStatus;
  referralCode?: string | null;
  invitedBy?: unknown;
  walletAddress?: string | null;
  transactionPasswordHash?: string | null;
  transactionPasswordUpdatedAt?: Date | string | null;
  emailVerifiedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type SafeUserDto = {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  referralCode: string | null;
  invitedBy: string | null;
  walletAddress: string | null;
  hasTransactionPassword: boolean;
  transactionPasswordUpdatedAt: Date | string | null;
  emailVerified: boolean;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  rank: string | null;
};

export type AuthSessionDto = {
  tokenType: "Bearer";
  accessTokenCookie: boolean;
  refreshTokenCookie: boolean;
  rotated?: boolean;
};

export type InternalAuthSessionDto = AuthSessionDto & {
  accessToken: string;
  refreshToken?: string;
};

export type OtpDeliveryDto = {
  accepted?: boolean;
  expiresAt?: Date | string | null;
  testMode?: boolean;
  testOtp?: string;
};

export type AuthResponseDto = {
  user: SafeUserDto;
  auth: AuthSessionDto;
  emailVerification?: OtpDeliveryDto & {
    required: boolean;
  };
};

export type InternalAuthResponseDto = Omit<AuthResponseDto, "auth"> & {
  auth: InternalAuthSessionDto;
};

export type ForgotPasswordResponseDto = OtpDeliveryDto & {
  accepted: boolean;
};

export type EmailVerificationRequestResponseDto = OtpDeliveryDto & {
  accepted: boolean;
};

export type VerifyEmailResponseDto = {
  verified: boolean;
  user: SafeUserDto;
};

export type ResetPasswordResponseDto = {
  reset: boolean;
};

export type LogoutResponseDto = {
  loggedOut: true;
};

export function toSafeUser(user: SanitizableUser, rank?: string | null): SafeUserDto {
  return {
    id: String(user._id ?? user.id),
    email: user.email,
    username: user.username ?? null,
    role: user.role,
    status: user.status,
    referralCode: user.referralCode ?? null,
    invitedBy: user.invitedBy ? String(user.invitedBy) : null,
    walletAddress: user.walletAddress ?? null,
    hasTransactionPassword: Boolean(
      user.transactionPasswordUpdatedAt ?? user.transactionPasswordHash,
    ),
    transactionPasswordUpdatedAt: user.transactionPasswordUpdatedAt ?? null,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null,
    rank: rank ?? null,
  };
}
