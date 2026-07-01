import { apiRequest } from "@/api/apiClient";
import { API_ENDPOINTS } from "@/api/endpoints";

export type PlatformDepositWallet = {
  address: string;
  network: string;
  configured: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type WalletSummary = {
  availableUsdt: number;
  lockedUsdt: number;
  lifetimeDepositsUsdt: number;
  lifetimeWithdrawalsUsdt: number;
  lifetimeRewardsUsdt: number;
  platformDepositWallet: PlatformDepositWallet;
  topUpBalance?: number;
};

export type CreateDepositInput = {
  amountUsdt: number;
  network?: "APP" | "BEP20";
  txnHash?: string;
  notes?: string;
};

export type CreateWithdrawalInput = {
  amountUsdt: number;
  network?: "BEP20";
  walletAddress: string;
  notes?: string;
};

export type DepositRequest = {
  id: string;
  type: string;
  status: string;
  amountUsdt: number;
  network: string;
  txnHash: string | null;
  notes: string;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  platformDepositWallet?: PlatformDepositWallet;
  wallet?: {
    availableUsdt: number;
    lockedUsdt: number;
    lifetimeDepositsUsdt: number;
    lifetimeWithdrawalsUsdt: number;
    lifetimeRewardsUsdt: number;
    topUpBalance?: number;
  };
};

export type WithdrawalRequest = DepositRequest & {
  chargeUsdt: number;
  grossAmountUsdt: number;
  netAmountUsdt: number;
  withdrawalChargePercent: number;
  walletAddress: string | null;
};

export type UserDeposit = Omit<DepositRequest, "platformDepositWallet">;

export type WalletDepositsParams = {
  page: number;
  limit: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
};

export type WalletDepositsResponse = {
  deposits: UserDeposit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

function buildWalletDepositsPath(params: WalletDepositsParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });

  if (params.status?.trim()) {
    query.set("status", params.status.trim());
  }

  if (params.fromDate?.trim()) {
    query.set("fromDate", params.fromDate.trim());
  }

  if (params.toDate?.trim()) {
    query.set("toDate", params.toDate.trim());
  }

  return `${API_ENDPOINTS.wallet.deposits}?${query.toString()}`;
}

export const walletService = {
  getSummary() {
    return apiRequest<WalletSummary>(API_ENDPOINTS.wallet.summary);
  },

  listDeposits(params: WalletDepositsParams) {
    return apiRequest<WalletDepositsResponse>(buildWalletDepositsPath(params));
  },

  createDeposit(input: CreateDepositInput) {
    return apiRequest<DepositRequest>(API_ENDPOINTS.wallet.deposits, {
      method: "POST",
      body: input
    });
  },

  createWithdrawal(input: CreateWithdrawalInput) {
    return apiRequest<WithdrawalRequest>(API_ENDPOINTS.wallet.withdrawals, {
      method: "POST",
      body: input
    });
  }
};
