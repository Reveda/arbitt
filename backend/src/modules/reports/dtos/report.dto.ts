import type { PaginationDto } from "../../../utils/ApiResponse";
import type { WalletBalanceDto } from "../../wallet/dtos/wallet.dto";

export type RewardDto = {
  id: string;
  amountUsdt: number;
  createdAt: Date | string | null;
  network: string;
  notes: string;
  payoutKind: string;
  payoutLevel: number | null;
  payoutPercent: number | null;
  payoutPeriodEnd: Date | string | null;
  payoutPeriodStart: Date | string | null;
  payoutPrincipalUsdt: number | null;
  payoutSourceTransactionId: string | null;
  payoutSourceUserId: string | null;
  payoutTier: string | null;
  reviewedAt: Date | string | null;
  status: string;
  updatedAt: Date | string | null;
};

export type UserDashboardMetricsResponseDto = {
  wallet: WalletBalanceDto;
  referrals: {
    directCount: number;
    activeTeamCount: number;
  };
  totalTeamMembers: number;
  totalTeamBusinessUsdt: number;
  totalDepositsUsdt: number;
  totalWithdrawalsUsdt: number;
  totalRewardsUsdt: number;
  depositOverview: {
    monthApprovedCount: number;
    monthApprovedUsdt: number;
    pendingCount: number;
    pendingUsdt: number;
    todayApprovedCount: number;
    todayApprovedUsdt: number;
    totalApprovedUsdt: number;
  };
  earningOverview: Array<{
    month: string;
    amountUsdt: number;
  }>;
  recentTransactions: Array<{
    id: string;
    type: string;
    status: string;
    amountUsdt: number;
    createdAt: Date | string | null;
  }>;
};

export type EarningsResponseDto = {
  summary: {
    approvedCount: number;
    availableUsdt: number;
    availableLimitUsdt: number;
    lifetimeRewardsUsdt: number;
    pendingCount: number;
    rejectedCount: number;
    totalApprovedUsdt: number;
    totalGeneratedUsdt: number;
    totalPendingUsdt: number;
    totalRejectedUsdt: number;
    byKind: Record<
      string,
      {
        approvedUsdt: number;
        pendingUsdt: number;
        totalCount: number;
        totalUsdt: number;
      }
    >;
  };
  rewards: RewardDto[];
  pagination: PaginationDto;
};
