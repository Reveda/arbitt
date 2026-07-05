import { apiRequest } from "@/api/apiClient";
import { API_ENDPOINTS } from "@/api/endpoints";

export type SuperAdminPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type SuperAdminListParams = {
  action?: string;
  entityType?: string;
  fromDate?: string;
  limit: number;
  method?: string;
  page: number;
  readStatus?: string;
  role?: string;
  routeGroup?: string;
  search?: string;
  status?: string;
  statusCode?: number | string;
  success?: boolean | string;
  toDate?: string;
  type?: string;
};

export type SuperAdminDailyPoint = {
  approvedCount: number;
  date: string;
  depositsUsdt: number;
  failedCount: number;
  pendingCount: number;
  rewardsUsdt: number;
  totalCount: number;
  withdrawalsUsdt: number;
};

export type SuperAdminBreakdown = {
  amountUsdt: number;
  count: number;
  status?: string;
  type?: string;
};

export type SuperAdminConfigurationHealth = {
  key: string;
  label: string;
  status: "active" | "configured" | "required" | string;
  value: string;
};

export type SuperAdminTransactionException = {
  amountUsdt: number;
  createdAt: string | null;
  id: string;
  network: string | null;
  status: string;
  type: string;
  user: {
    email: string | null;
    username: string | null;
  } | null;
};

export type SuperAdminTransactionRecord = SuperAdminTransactionException & {
  notes: string;
  reviewedAt: string | null;
  txnHash: string | null;
  updatedAt: string | null;
};

export type SuperAdminAuditLog = {
  action: string;
  actor?: {
    email: string | null;
    username: string | null;
  } | null;
  createdAt: string | null;
  entityId?: string;
  entityType: string;
  id: string;
  ipAddress: string | null;
};

export type SuperAdminAdminRecord = {
  email: string | null;
  emailVerified: boolean;
  id: string;
  joinedAt: string | null;
  lastLoginAt: string | null;
  role: string;
  status: string;
  username: string | null;
};

export type SuperAdminSettingRecord = {
  createdAt: string | null;
  id: string;
  key: string;
  updatedAt: string | null;
  valueType: string;
};

export type SuperAdminNotificationRecord = {
  createdAt: string | null;
  id: string;
  message: string;
  readAt: string | null;
  title: string;
  type: string;
  user: {
    email: string | null;
    username: string | null;
  } | null;
};

export type SuperAdminApiActivityRecord = {
  action: string;
  createdAt: string | null;
  durationMs: number;
  id: string;
  ipAddress: string | null;
  method: string;
  path: string;
  routeGroup: string;
  statusCode: number;
  success: boolean;
  user: {
    email: string | null;
    username: string | null;
  } | null;
  userRole: string | null;
};

export type SuperAdminTransactionsResponse = {
  pagination: SuperAdminPagination;
  records: SuperAdminTransactionRecord[];
  summary: {
    total: number;
    totalAmountUsdt: number;
  };
};

export type SuperAdminAuditLogsResponse = {
  pagination: SuperAdminPagination;
  records: SuperAdminAuditLog[];
};

export type SuperAdminAdminsResponse = {
  pagination: SuperAdminPagination;
  records: SuperAdminAdminRecord[];
};

export type SuperAdminSettingsResponse = {
  pagination: SuperAdminPagination;
  records: SuperAdminSettingRecord[];
};

export type SuperAdminNotificationsResponse = {
  pagination: SuperAdminPagination;
  records: SuperAdminNotificationRecord[];
};

export type SuperAdminApiActivityResponse = {
  pagination: SuperAdminPagination;
  records: SuperAdminApiActivityRecord[];
};

export type SuperAdminWorkflowStep = {
  key: string;
  label: string;
  metric: string;
  status: "attention" | "blocked" | "healthy" | "idle" | string;
  text: string;
};

export type SuperAdminOverview = {
  configurationHealth: SuperAdminConfigurationHealth[];
  dailySeries: SuperAdminDailyPoint[];
  metrics: {
    activeAdmins: number;
    activeSettings: number;
    activeSuperAdmins: number;
    adminAuditEvents: number;
    apiActivity24h: number;
    auditEvents24h: number;
    authAuditEvents: number;
    approvedDeposits: number;
    approvedPayouts: number;
    depositAuditEvents: number;
    failedApiActivity24h: number;
    failedTransactions: number;
    levelIncomePayouts: number;
    paymentWalletAuditEvents: number;
    pendingDeposits: number;
    pendingPayouts: number;
    pendingTransactions: number;
    pendingWithdrawals: number;
    payoutAuditEvents: number;
    rejectedDeposits: number;
    rejectedPayouts: number;
    salaryRoyaltyPayouts: number;
    securityNotifications: number;
    successfulTransactions: number;
    totalNotifications: number;
    totalTransactions: number;
    unreadNotifications: number;
    userWallets: number;
    weeklyPayouts: number;
  };
  recentAuditLogs: SuperAdminAuditLog[];
  recentExceptions: SuperAdminTransactionException[];
  statusBreakdown: Array<SuperAdminBreakdown & { status: string }>;
  typeBreakdown: Array<SuperAdminBreakdown & { type: string }>;
  workflowSteps: SuperAdminWorkflowStep[];
};

function buildQuery(params: SuperAdminListParams) {
  const query = new URLSearchParams({
    limit: String(params.limit),
    page: String(params.page)
  });

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.status?.trim()) {
    query.set("status", params.status.trim());
  }

  if (params.type?.trim()) {
    query.set("type", params.type.trim());
  }

  if (params.role?.trim()) {
    query.set("role", params.role.trim());
  }

  if (params.method?.trim()) {
    query.set("method", params.method.trim());
  }

  if (params.routeGroup?.trim()) {
    query.set("routeGroup", params.routeGroup.trim());
  }

  if (params.statusCode !== undefined && String(params.statusCode).trim()) {
    query.set("statusCode", String(params.statusCode).trim());
  }

  if (typeof params.success === "boolean") {
    query.set("success", String(params.success));
  } else if (params.success?.trim()) {
    query.set("success", params.success.trim());
  }

  if (params.readStatus?.trim()) {
    query.set("readStatus", params.readStatus.trim());
  }

  if (params.action?.trim()) {
    query.set("action", params.action.trim());
  }

  if (params.entityType?.trim()) {
    query.set("entityType", params.entityType.trim());
  }

  if (params.fromDate?.trim()) {
    query.set("fromDate", params.fromDate.trim());
  }

  if (params.toDate?.trim()) {
    query.set("toDate", params.toDate.trim());
  }

  return query.toString();
}

export const superAdminService = {
  getOverview() {
    return apiRequest<SuperAdminOverview>(API_ENDPOINTS.superAdmin.overview);
  },

  listAdmins(params: SuperAdminListParams) {
    return apiRequest<SuperAdminAdminsResponse>(
      `${API_ENDPOINTS.superAdmin.admins}?${buildQuery(params)}`
    );
  },

  listAuditLogs(params: SuperAdminListParams) {
    return apiRequest<SuperAdminAuditLogsResponse>(
      `${API_ENDPOINTS.superAdmin.auditLogs}?${buildQuery(params)}`
    );
  },

  listSettings(params: SuperAdminListParams) {
    return apiRequest<SuperAdminSettingsResponse>(
      `${API_ENDPOINTS.superAdmin.settings}?${buildQuery(params)}`
    );
  },

  listNotifications(params: SuperAdminListParams) {
    return apiRequest<SuperAdminNotificationsResponse>(
      `${API_ENDPOINTS.superAdmin.notifications}?${buildQuery(params)}`
    );
  },

  listApiActivity(params: SuperAdminListParams) {
    return apiRequest<SuperAdminApiActivityResponse>(
      `${API_ENDPOINTS.superAdmin.apiActivity}?${buildQuery(params)}`
    );
  },

  listTransactions(params: SuperAdminListParams) {
    return apiRequest<SuperAdminTransactionsResponse>(
      `${API_ENDPOINTS.superAdmin.transactions}?${buildQuery(params)}`
    );
  },

  overrideTransactionStatus(transactionId: string, status: string, notes?: string) {
    return apiRequest<any>(
      `/super-admin/transactions/${transactionId}/status`,
      {
        body: { status, notes },
        method: "PATCH",
      }
    );
  },

  getPayoutSummary() {
    return apiRequest<SuperAdminPayoutSummary>(
      `/super-admin/payout-summary`
    );
  },

  getSkippedPayouts() {
    return apiRequest<SuperAdminSkippedPayout[]>(
      `/super-admin/skipped-payouts`
    );
  },

  processSkippedPayout(payload: { userId: string; payoutKind: string; amountUsdt: number; sourceId: string; notes?: string }) {
    return apiRequest<any>(
      `/super-admin/skipped-payouts/process`,
      {
        body: payload,
        method: "POST",
      }
    );
  },
};

export type SuperAdminSkippedPayout = {
  userId: string;
  username: string;
  email: string;
  payoutKind: "weekly" | "level" | "salary_royalty";
  description: string;
  amountUsdt: number;
  sourceId: string;
  details: string;
};

export type SuperAdminPayoutSummary = {
  todayStats: {
    totalAmountGenerated: number;
    totalAmountSent: number;
    usersCount: number;
    totalCount: number;
  };
  breakdown: {
    level: { count: number; amount: number };
    weekly: { count: number; amount: number };
    royalty: { count: number; amount: number };
  };
  timing: {
    createdTime: string | null;
    creditedTime: string | null;
  };
};
