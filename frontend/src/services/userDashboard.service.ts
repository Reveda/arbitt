import { apiRequest } from "@/api/apiClient";
import { API_ENDPOINTS } from "@/api/endpoints";

export type UserDashboardOverview = {
  wallet: {
    availableUsdt: number;
    lockedUsdt: number;
    lifetimeDepositsUsdt: number;
    lifetimeWithdrawalsUsdt: number;
    lifetimeRewardsUsdt: number;
  };
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
    type: "deposit" | "withdrawal" | "reward" | "adjustment" | "plan_purchase";
    status: string;
    amountUsdt: number;
    createdAt: string | null;
  }>;
};

let dashboardRequest: Promise<Awaited<ReturnType<typeof apiRequest<UserDashboardOverview>>>> | null = null;

export const userDashboardService = {
  getDashboard() {
    if (dashboardRequest) {
      return dashboardRequest;
    }

    dashboardRequest = apiRequest<UserDashboardOverview>(API_ENDPOINTS.reports.dashboard).finally(() => {
      dashboardRequest = null;
    });

    return dashboardRequest;
  }
};
