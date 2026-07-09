import type { UserRole, UserStatus } from "../../../constants/roles";

export type UserRepositoryRecord = {
  _id?: unknown;
  email: string;
  username?: string | null;
  role: UserRole;
  status: UserStatus;
  referralCode?: string | null;
  invitedBy?: unknown;
  walletAddress?: string | null;
  pendingWalletAddress?: string | null;
  walletAddressChangeOtpHash?: string | null;
  walletAddressChangeOtpExpiresAt?: Date | string | null;
  walletAddressChangeOtpAttempts?: number | null;
  transactionPasswordHash?: string | null;
  transactionPasswordUpdatedAt?: Date | string | null;
  emailVerifiedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};
