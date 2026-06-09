import { apiRequest } from "@/api/apiClient";
import { API_ENDPOINTS } from "@/api/endpoints";

export type EarningKind = "weekly" | "level" | "salary_royalty";
export type EarningStatus = "pending" | "approved" | "rejected" | "completed" | "failed";

export type UserEarningRecord = {
  id: string;
  amountUsdt: number;
  createdAt: string | null;
  network: string;
  notes: string;
  payoutKind: EarningKind;
  payoutLevel: number | null;
  payoutPercent: number | null;
  payoutPeriodEnd: string | null;
  payoutPeriodStart: string | null;
  payoutPrincipalUsdt: number | null;
  payoutSourceTransactionId: string | null;
  payoutSourceUserId: string | null;
  payoutTier: string | null;
  reviewedAt: string | null;
  status: EarningStatus;
  updatedAt: string | null;
};

export type UserEarningsParams = {
  page: number;
  limit: number;
  status?: EarningStatus;
  kind?: EarningKind;
  fromDate?: string;
  toDate?: string;
};

export type EarningKindSummary = {
  approvedUsdt: number;
  pendingUsdt: number;
  totalCount: number;
  totalUsdt: number;
};

export type UserEarningsResponse = {
  summary: {
    approvedCount: number;
    availableUsdt: number;
    lifetimeRewardsUsdt: number;
    pendingCount: number;
    rejectedCount: number;
    totalApprovedUsdt: number;
    totalGeneratedUsdt: number;
    totalPendingUsdt: number;
    totalRejectedUsdt: number;
    byKind: Record<EarningKind, EarningKindSummary>;
  };
  rewards: UserEarningRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

function buildEarningsPath(params: UserEarningsParams) {
  const query = new URLSearchParams({
    limit: String(params.limit),
    page: String(params.page)
  });

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.kind) {
    query.set("kind", params.kind);
  }

  if (params.fromDate?.trim()) {
    query.set("fromDate", params.fromDate.trim());
  }

  if (params.toDate?.trim()) {
    query.set("toDate", params.toDate.trim());
  }

  return `${API_ENDPOINTS.reports.earnings}?${query.toString()}`;
}

export const earningsService = {
  getEarnings(params: UserEarningsParams) {
    return apiRequest<UserEarningsResponse>(buildEarningsPath(params));
  }
};
