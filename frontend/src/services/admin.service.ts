import { apiRequest } from "@/api/apiClient";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiSuccessResponse } from "@/api/types";
import type { AuthUser } from "@/services/auth.service";
import type { PlatformDepositWallet } from "@/services/wallet.service";

export type AdminOverview = {
  totalUsers: number;
  activeUsers: number;
  pendingTransactions: number;
  pendingDeposits: number;
  pendingPlanPurchases: number;
  pendingWithdrawals: number;
  pendingPayouts: number;
  activePlans: number;
  totalDepositsUsdt: number;
  totalPackagesSellUsdt: number;
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
  totalRoiGeneratedUsdt: number;
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
    createdAt: string | null;
    userEmail: string | null;
    userName: string;
  }>;
  recentAuditLogs: unknown[];
};

export type AdminUsersParams = {
  page: number;
  limit: number;
  search?: string;
};

export type AdminReferralsParams = {
  page: number;
  limit: number;
  search?: string;
  parentUserId?: string;
  rootOnly?: boolean;
  level?: number;
  status?: string;
};

export type AdminDepositsParams = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
};

export type AdminPayoutsParams = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  payoutKind?: string;
  fromDate?: string;
  weekStart?: string;
  toDate?: string;
};

export type AdminPlanPurchasesParams = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
};

export type AdminWithdrawalsParams = AdminPlanPurchasesParams;

export type AdminWalletsParams = {
  page: number;
  limit: number;
  search?: string;
};

export type AdminUsersResponse = {
  users: AuthUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type AdminDeposit = {
  id: string;
  user: AdminReferralUser | null;
  amountUsdt: number;
  status: string;
  txnHash: string | null;
  network: string;
  notes: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
};

export type AdminDepositsResponse = {
  deposits: AdminDeposit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type AdminPayout = {
  id: string;
  user: AdminReferralUser | null;
  amountUsdt: number;
  status: string;
  network: string;
  notes: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  payoutKind: string;
  payoutLevel: number | null;
  payoutPeriodStart: string | null;
  payoutPeriodEnd: string | null;
  payoutTier: string | null;
  payoutPercent: number | null;
  payoutPrincipalUsdt: number | null;
  payoutSourceTransactionId: string | null;
  payoutSourceUserId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminPayoutsResponse = {
  summary: {
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    totalPayoutUsdt: number;
    totalPendingUsdt: number;
    totalApprovedUsdt: number;
  };
  payouts: AdminPayout[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type AdminPayoutReviewResponse = {
  payout: AdminPayout;
};

export type AdminPlanPurchaseRequest = {
  id: string;
  user: AdminReferralUser | null;
  amountUsdt: number;
  status: string;
  network: string;
  notes: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  planName: string;
  tier: string | null;
  weeklyReturnPercent: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminPlanPurchasesResponse = {
  planPurchases: AdminPlanPurchaseRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type AdminPlanPurchaseReviewResponse = {
  planPurchase: AdminPlanPurchaseRequest;
};

export type AdminWithdrawalRequest = {
  id: string;
  user: AdminReferralUser | null;
  amountUsdt: number;
  grossAmountUsdt: number;
  chargeUsdt: number;
  withdrawalChargePercent: number;
  status: string;
  network: string;
  notes: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminWithdrawalsResponse = {
  withdrawals: AdminWithdrawalRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type AdminWithdrawalReviewResponse = {
  withdrawal: AdminWithdrawalRequest;
};

export type AdminPayoutGenerateResponse = {
  createdCount: number;
  eligibleCount: number;
  levelCreatedCount: number;
  salaryRoyaltyCreatedCount: number;
  skippedCount: number;
  updatedCount: number;
  weeklyCreatedCount: number;
  weeklyUpdatedCount: number;
  period: {
    start: string;
    end: string;
  };
  payouts: AdminPayout[];
};

export type AdminPaymentWalletResponse = PlatformDepositWallet;

export type AdminPaymentWalletUpdateResponse = {
  wallet: PlatformDepositWallet;
};

export type AdminWallet = {
  id: string;
  user: AdminReferralUser | null;
  availableUsdt: number;
  topUpBalance: number;
  lockedUsdt: number;
  lifetimeDepositsUsdt: number;
  lifetimeWithdrawalsUsdt: number;
  lifetimeRewardsUsdt: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminWalletsResponse = {
  summary: {
    total: number;
    platformAvailableUsdt: number;
    platformLifetimeDepositsUsdt: number;
    platformLifetimeRewardsUsdt: number;
    platformLifetimeWithdrawalsUsdt: number;
    platformLockedUsdt: number;
    platformWalletCount: number;
    totalAvailableUsdt: number;
    totalTopUpBalanceUsdt: number;
    totalLockedUsdt: number;
    totalLifetimeDepositsUsdt: number;
    totalLifetimeWithdrawalsUsdt: number;
    totalLifetimeRewardsUsdt: number;
    totalPlanPurchasesUsdt: number;
  };
  wallets: AdminWallet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type AdminReferralUser = {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  status: string;
  referralCode: string | null;
  emailVerified: boolean;
  joinedAt: string | null;
  rank: string | null;
};

export type AdminReferralNode = {
  id: string;
  user: AdminReferralUser | null;
  parent: AdminReferralUser | null;
  parentUserId: string | null;
  level: number;
  path: string[];
  directCount: number;
  activeTeamCount: number;
  teamBusinessUsdt: number;
  selfBusinessUsdt: number;
  createdAt: string | null;
};

export type AdminReferralLevelSummary = {
  level: number;
  key: string;
  count: number;
  samples: Array<{
    id: string;
    email: string | null;
    username: string | null;
    status: string;
  }>;
};

export type AdminReferralNetwork = {
  summary: {
    totalUsers: number;
    activeUsers: number;
    linkedUsers: number;
    rootUsers: number;
    totalReferralRecords: number;
    maxLevel: number;
  };
  nodes: AdminReferralNode[];
  levels: Record<string, AdminReferralNode[]>;
  levelSummaries: AdminReferralLevelSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

const ADMIN_OVERVIEW_CACHE_TTL_MS = 15_000;

let overviewCache: { data: ApiSuccessResponse<AdminOverview>; cachedAt: number } | null = null;
let overviewRequest: Promise<ApiSuccessResponse<AdminOverview>> | null = null;
const usersRequests = new Map<string, Promise<ApiSuccessResponse<AdminUsersResponse>>>();
const referralRequests = new Map<string, Promise<ApiSuccessResponse<AdminReferralNetwork>>>();
const depositRequests = new Map<string, Promise<ApiSuccessResponse<AdminDepositsResponse>>>();
const planPurchaseRequests = new Map<string, Promise<ApiSuccessResponse<AdminPlanPurchasesResponse>>>();
const payoutRequests = new Map<string, Promise<ApiSuccessResponse<AdminPayoutsResponse>>>();
const withdrawalRequests = new Map<string, Promise<ApiSuccessResponse<AdminWithdrawalsResponse>>>();
const walletRequests = new Map<string, Promise<ApiSuccessResponse<AdminWalletsResponse>>>();

function buildAdminUsersPath(params: AdminUsersParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  return `${API_ENDPOINTS.admin.users}?${query.toString()}`;
}

function buildAdminReferralsPath(params: AdminReferralsParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.parentUserId?.trim()) {
    query.set("parentUserId", params.parentUserId.trim());
  }

  if (params.rootOnly) {
    query.set("rootOnly", "true");
  }

  if (typeof params.level === "number") {
    query.set("level", String(params.level));
  }

  if (params.status?.trim()) {
    query.set("status", params.status.trim());
  }

  return `${API_ENDPOINTS.admin.referrals}?${query.toString()}`;
}

function buildAdminDepositsPath(params: AdminDepositsParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.status?.trim()) {
    query.set("status", params.status.trim());
  }

  if (params.fromDate?.trim()) {
    query.set("fromDate", params.fromDate.trim());
  }

  if (params.toDate?.trim()) {
    query.set("toDate", params.toDate.trim());
  }

  return `${API_ENDPOINTS.admin.deposits}?${query.toString()}`;
}

function buildAdminPayoutsPath(params: AdminPayoutsParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.status?.trim()) {
    query.set("status", params.status.trim());
  }

  if (params.payoutKind?.trim()) {
    query.set("payoutKind", params.payoutKind.trim());
  }

  if (params.fromDate?.trim()) {
    query.set("fromDate", params.fromDate.trim());
  }

  if (params.toDate?.trim()) {
    query.set("toDate", params.toDate.trim());
  }

  if (params.weekStart?.trim()) {
    query.set("weekStart", params.weekStart.trim());
  }

  return `${API_ENDPOINTS.admin.payouts}?${query.toString()}`;
}

function buildAdminPlanPurchasesPath(params: AdminPlanPurchasesParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.status?.trim()) {
    query.set("status", params.status.trim());
  }

  if (params.fromDate?.trim()) {
    query.set("fromDate", params.fromDate.trim());
  }

  if (params.toDate?.trim()) {
    query.set("toDate", params.toDate.trim());
  }

  return `${API_ENDPOINTS.admin.planPurchases}?${query.toString()}`;
}

function buildAdminWithdrawalsPath(params: AdminWithdrawalsParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.status?.trim()) {
    query.set("status", params.status.trim());
  }

  if (params.fromDate?.trim()) {
    query.set("fromDate", params.fromDate.trim());
  }

  if (params.toDate?.trim()) {
    query.set("toDate", params.toDate.trim());
  }

  return `${API_ENDPOINTS.admin.withdrawals}?${query.toString()}`;
}

function buildAdminWalletsPath(params: AdminWalletsParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  return `${API_ENDPOINTS.admin.wallets}?${query.toString()}`;
}

export const adminService = {
  getOverview(params?: { fromDate?: string; toDate?: string }) {
    const query = params
      ? new URLSearchParams({
          ...(params.fromDate && { fromDate: params.fromDate }),
          ...(params.toDate && { toDate: params.toDate }),
        }).toString()
      : "";
    const path = query ? `${API_ENDPOINTS.admin.overview}?${query}` : API_ENDPOINTS.admin.overview;

    if (!params) {
      if (overviewCache && Date.now() - overviewCache.cachedAt < ADMIN_OVERVIEW_CACHE_TTL_MS) {
        return Promise.resolve(overviewCache.data);
      }

      if (overviewRequest) {
        return overviewRequest;
      }

      overviewRequest = apiRequest<AdminOverview>(path)
        .then((response) => {
          overviewCache = {
            cachedAt: Date.now(),
            data: response
          };
          return response;
        })
        .finally(() => {
          overviewRequest = null;
        });

      return overviewRequest;
    }

    return apiRequest<AdminOverview>(path);
  },

  listUsers(params: AdminUsersParams) {
    const path = buildAdminUsersPath(params);
    const existingRequest = usersRequests.get(path);

    if (existingRequest) {
      return existingRequest;
    }

    const request = apiRequest<AdminUsersResponse>(path).finally(() => {
      usersRequests.delete(path);
    });

    usersRequests.set(path, request);
    return request;
  },

  listReferrals(params: AdminReferralsParams) {
    const path = buildAdminReferralsPath(params);
    const existingRequest = referralRequests.get(path);

    if (existingRequest) {
      return existingRequest;
    }

    const request = apiRequest<AdminReferralNetwork>(path).finally(() => {
      referralRequests.delete(path);
    });

    referralRequests.set(path, request);
    return request;
  },

  listDeposits(params: AdminDepositsParams) {
    const path = buildAdminDepositsPath(params);
    const existingRequest = depositRequests.get(path);

    if (existingRequest) {
      return existingRequest;
    }

    const request = apiRequest<AdminDepositsResponse>(path).finally(() => {
      depositRequests.delete(path);
    });

    depositRequests.set(path, request);
    return request;
  },

  listPayouts(params: AdminPayoutsParams) {
    const path = buildAdminPayoutsPath(params);
    const existingRequest = payoutRequests.get(path);

    if (existingRequest) {
      return existingRequest;
    }

    const request = apiRequest<AdminPayoutsResponse>(path).finally(() => {
      payoutRequests.delete(path);
    });

    payoutRequests.set(path, request);
    return request;
  },

  listPlanPurchases(params: AdminPlanPurchasesParams) {
    const path = buildAdminPlanPurchasesPath(params);
    const existingRequest = planPurchaseRequests.get(path);

    if (existingRequest) {
      return existingRequest;
    }

    const request = apiRequest<AdminPlanPurchasesResponse>(path).finally(() => {
      planPurchaseRequests.delete(path);
    });

    planPurchaseRequests.set(path, request);
    return request;
  },

  listWithdrawals(params: AdminWithdrawalsParams) {
    const path = buildAdminWithdrawalsPath(params);
    const existingRequest = withdrawalRequests.get(path);

    if (existingRequest) {
      return existingRequest;
    }

    const request = apiRequest<AdminWithdrawalsResponse>(path).finally(() => {
      withdrawalRequests.delete(path);
    });

    withdrawalRequests.set(path, request);
    return request;
  },

  listWallets(params: AdminWalletsParams) {
    const path = buildAdminWalletsPath(params);
    const existingRequest = walletRequests.get(path);

    if (existingRequest) {
      return existingRequest;
    }

    const request = apiRequest<AdminWalletsResponse>(path).finally(() => {
      walletRequests.delete(path);
    });

    walletRequests.set(path, request);
    return request;
  },

  generatePayouts(input: { weekStart?: string }) {
    overviewCache = null;
    payoutRequests.clear();

    return apiRequest<AdminPayoutGenerateResponse>(`${API_ENDPOINTS.admin.payouts}/generate`, {
      method: "POST",
      body: input
    });
  },

  reviewPayout(transactionId: string, action: "approve" | "reject", notes?: string) {
    overviewCache = null;
    payoutRequests.clear();

    return apiRequest<AdminPayoutReviewResponse>(
      `${API_ENDPOINTS.admin.payouts}/${transactionId}/review`,
      {
        method: "PATCH",
        body: { action, notes }
      }
    );
  },

  reviewPlanPurchase(transactionId: string, action: "approve" | "reject", notes?: string) {
    overviewCache = null;
    planPurchaseRequests.clear();
    walletRequests.clear();

    return apiRequest<AdminPlanPurchaseReviewResponse>(
      `${API_ENDPOINTS.admin.planPurchases}/${transactionId}/review`,
      {
        method: "PATCH",
        body: { action, notes }
      }
    );
  },

  reviewWithdrawal(transactionId: string, action: "approve" | "reject", notes?: string) {
    overviewCache = null;
    withdrawalRequests.clear();
    walletRequests.clear();

    return apiRequest<AdminWithdrawalReviewResponse>(
      `${API_ENDPOINTS.admin.withdrawals}/${transactionId}/review`,
      {
        method: "PATCH",
        body: { action, notes }
      }
    );
  },

  getPaymentWallet() {
    return apiRequest<AdminPaymentWalletResponse>(API_ENDPOINTS.admin.paymentWallet);
  },

  updatePaymentWallet(input: { address: string; network: string }) {
    return apiRequest<AdminPaymentWalletUpdateResponse>(API_ENDPOINTS.admin.paymentWallet, {
      method: "PATCH",
      body: input
    });
  },

  editUser(userId: string, body: { username?: string; role?: string; status?: string }) {
    return apiRequest<any>(`${API_ENDPOINTS.admin.users}/${userId}`, {
      method: "PATCH",
      body
    });
  },

  deleteUser(userId: string) {
    return apiRequest<any>(`${API_ENDPOINTS.admin.users}/${userId}`, {
      method: "DELETE"
    });
  }
};
