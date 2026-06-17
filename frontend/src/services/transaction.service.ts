import { apiRequest } from "@/api/apiClient";
import { API_ENDPOINTS } from "@/api/endpoints";

export type UserTransaction = {
  id: string;
  type: "deposit" | "withdrawal" | "reward" | "adjustment" | "plan_purchase";
  status: "pending" | "approved" | "rejected" | "completed" | "failed";
  amountUsdt: number;
  network: string;
  txnHash: string | null;
  notes: string;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  payoutKind?: "weekly" | "level" | "salary_royalty" | null;
};

export type UserTransactionsParams = {
  page: number;
  limit: number;
  type?: UserTransaction["type"];
  status?: UserTransaction["status"];
  fromDate?: string;
  toDate?: string;
};

export type UserTransactionsResponse = {
  transactions: UserTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

function buildTransactionsPath(params: UserTransactionsParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });

  if (params.type) {
    query.set("type", params.type);
  }

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.fromDate?.trim()) {
    query.set("fromDate", params.fromDate.trim());
  }

  if (params.toDate?.trim()) {
    query.set("toDate", params.toDate.trim());
  }

  return `${API_ENDPOINTS.transactions.list}?${query.toString()}`;
}

export const transactionService = {
  listTransactions(params: UserTransactionsParams) {
    return apiRequest<UserTransactionsResponse>(buildTransactionsPath(params));
  }
};
