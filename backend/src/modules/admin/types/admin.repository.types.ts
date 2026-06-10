import type { UserRepositoryRecord } from "../../users/types/user.repository.types";

export type AdminListUsersInput = {
  search?: string;
  skip: number;
  limit: number;
};

export type AdminReferralListInput = {
  search?: string;
  parentUserId?: string;
  rootOnly?: boolean;
  level?: number;
  status?: string;
  skip: number;
  limit: number;
};

export type ReferralLevelSummary = {
  level: number;
  count: number;
  samples: Array<{
    id: unknown;
    email?: string;
    username?: string | null;
    status?: string;
  }>;
};

export type AdminPopulatedUserRepositoryRecord = {
  _id?: unknown;
  email?: string;
  username?: string | null;
  role?: string;
  status?: string;
  referralCode?: string | null;
  invitedBy?: unknown;
  emailVerifiedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

export type AdminAuditLogRepositoryRecord = {
  _id?: unknown;
  actorUserId?: unknown;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

export type AdminTransactionRepositoryRecord = {
  _id?: unknown;
  userId: unknown | AdminPopulatedUserRepositoryRecord;
  type?: string;
  amountUsdt: number;
  status: string;
  txnHash?: string | null;
  network?: string | null;
  notes?: string | null;
  reviewedBy?: unknown;
  reviewedAt?: Date | string | null;
  payoutKind?: string | null;
  payoutLevel?: number | null;
  payoutPeriodStart?: Date | string | null;
  payoutPeriodEnd?: Date | string | null;
  payoutTier?: string | null;
  payoutPercent?: number | null;
  payoutPrincipalUsdt?: number | null;
  payoutSourceTransactionId?: unknown;
  payoutSourceUserId?: unknown;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

export type AdminWalletRepositoryRecord = {
  _id?: unknown;
  userId: unknown | AdminPopulatedUserRepositoryRecord;
  availableUsdt?: number;
  lockedUsdt?: number;
  lifetimeDepositsUsdt?: number;
  lifetimeWithdrawalsUsdt?: number;
  lifetimeRewardsUsdt?: number;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

export type AdminReferralRepositoryRecord = {
  _id?: unknown;
  userId?: unknown | AdminPopulatedUserRepositoryRecord;
  parentUserId?: unknown | AdminPopulatedUserRepositoryRecord | null;
  level?: number;
  path?: unknown[];
  directCount?: number;
  activeTeamCount?: number;
  createdAt?: Date | string | null;
};

export type AdminOverviewRepositoryResult = {
  totalUsers: number;
  activeUsers: number;
  pendingTransactions: number;
  pendingDeposits: number;
  pendingPlanPurchases: number;
  pendingWithdrawals: number;
  pendingPayouts: number;
  activePlans: number;
  totalDepositsUsdt: number;
  depositOverview: {
    monthApprovedCount: number;
    monthApprovedUsdt: number;
    pendingCount: number;
    pendingUsdt: number;
    todayApprovedCount: number;
    todayApprovedUsdt: number;
    totalApprovedUsdt: number;
  };
  totalWithdrawalsUsdt: number;
  earningsPaidUsdt: number;
  platformEarningsUsdt: number;
  depositWithdrawalFlow: {
    depositsUsdt: number;
    withdrawalsUsdt: number;
    depositsPercent: number;
    withdrawalsPercent: number;
  };
  userGrowth: Array<{
    month: string;
    users: number;
  }>;
  recentDeposits: Array<{
    id: string;
    amountUsdt: number;
    status: string;
    createdAt?: Date | string | null;
    userEmail: string | null;
    userName: string;
  }>;
  recentAuditLogs: AdminAuditLogRepositoryRecord[];
};

export type AdminListUsersRepositoryResult = {
  users: UserRepositoryRecord[];
  total: number;
};

export type AdminListDepositsRepositoryResult = {
  deposits: AdminTransactionRepositoryRecord[];
  total: number;
};

export type AdminListPlanPurchasesRepositoryResult = {
  planPurchases: AdminTransactionRepositoryRecord[];
  total: number;
};

export type AdminListWithdrawalsRepositoryResult = {
  withdrawals: AdminTransactionRepositoryRecord[];
  total: number;
};

export type PayoutAggregationSummary = {
  pendingCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  totalPayoutUsdt?: number;
  totalPendingUsdt?: number;
  totalApprovedUsdt?: number;
};

export type AdminListPayoutsRepositoryResult = {
  payouts: AdminTransactionRepositoryRecord[];
  summary: PayoutAggregationSummary;
  total: number;
};

export type AdminWalletSummaryRepositoryRecord = {
  total: number;
  platformAvailableUsdt: number;
  platformLifetimeDepositsUsdt: number;
  platformLifetimeRewardsUsdt: number;
  platformLifetimeWithdrawalsUsdt: number;
  platformLockedUsdt: number;
  platformWalletCount: number;
  totalAvailableUsdt: number;
  totalLockedUsdt: number;
  totalLifetimeDepositsUsdt: number;
  totalLifetimeWithdrawalsUsdt: number;
  totalLifetimeRewardsUsdt: number;
};

export type AdminListWalletsRepositoryResult = {
  wallets: AdminWalletRepositoryRecord[];
  summary: AdminWalletSummaryRepositoryRecord;
};

export type AdminReferralNetworkRepositoryResult = {
  activeUsers: number;
  linkedUsers: number;
  maxLevel: number;
  referrals: AdminReferralRepositoryRecord[];
  rootUsers: number;
  total: number;
  totalUsers: number;
  levelSummaries: ReferralLevelSummary[];
};

export type DateRangeFilter = {
  $gte?: Date;
  $lt?: Date;
};

export type AdminDepositListInput = {
  search?: string;
  status?: string;
  dateRange?: DateRangeFilter;
  skip: number;
  limit: number;
};

export type AdminPlanPurchaseListInput = AdminDepositListInput;

export type AdminWithdrawalListInput = AdminDepositListInput;

export type AdminPayoutListInput = {
  search?: string;
  status?: string;
  dateRange?: DateRangeFilter;
  payoutPeriod?: {
    end: Date;
    start: Date;
  };
  skip: number;
  limit: number;
};

export type AdminWalletListInput = {
  search?: string;
  skip: number;
  limit: number;
};

export type PayoutEligibleWalletRecord = {
  _id: unknown;
  userId: unknown;
  availableUsdt?: number;
  lifetimeDepositsUsdt?: number;
  lifetimeRewardsUsdt?: number;
  latestEligibleDepositAt?: Date;
  user?: {
    _id?: unknown;
    email?: string;
    username?: string | null;
    status?: string;
    role?: string;
  };
};

export type CreatePayoutTransactionInput = {
  userId: string;
  amountUsdt: number;
  notes: string;
  payoutPeriodStart: Date;
  payoutPeriodEnd: Date;
  payoutTier: string;
  payoutPercent: number;
  payoutPrincipalUsdt: number;
};

export type UpdateWeeklyPayoutInput = CreatePayoutTransactionInput & {
  transactionId: string;
};
