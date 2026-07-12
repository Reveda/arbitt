import { apiRequest } from "@/api/apiClient";
import { API_ENDPOINTS } from "@/api/endpoints";

export type PaymentNetwork = "BEP20";

export type PaymentIntent = {
  id: string;
  amountUsdt: number;
  amountTokenUnits: string;
  chainId: string;
  chainName: string;
  confirmedAt: string | null;
  createdAt: string | null;
  detectedAt: string | null;
  expiresAt: string | null;
  failureReason: string | null;
  gasToken: string;
  logIndex: string | null;
  network: PaymentNetwork | string;
  planName: string;
  receiverAddress: string;
  sourceTransactionId: string | null;
  status: "pending" | "detected" | "completed" | "expired" | "failed" | "ambiguous";
  tier: string;
  tokenContract: string;
  tokenDecimals: number;
  tokenSymbol: string;
  txnHash: string | null;
  updatedAt: string | null;
  weeklyReturnPercent: number;
};

export type CreatePlanPaymentIntentInput = {
  amountUsdt: string | number;
  network: PaymentNetwork;
  tier: string;
};

export type CreateDepositPaymentIntentInput = {
  amountUsdt: string | number;
  network: PaymentNetwork;
};

export type PaymentIntentResponse = {
  intent: PaymentIntent;
};

export const paymentService = {
  createDepositIntent(input: CreateDepositPaymentIntentInput) {
    return apiRequest<PaymentIntentResponse>(API_ENDPOINTS.payments.depositIntents, {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: input
    });
  },

  createPlanIntent(input: CreatePlanPaymentIntentInput) {
    return apiRequest<PaymentIntentResponse>(API_ENDPOINTS.payments.planIntents, {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: input
    });
  },

  getIntent(intentId: string) {
    return apiRequest<PaymentIntentResponse>(API_ENDPOINTS.payments.intent(intentId));
  },

  submitIntentTxHash(intentId: string, txnHash: string) {
    return apiRequest<PaymentIntentResponse>(API_ENDPOINTS.payments.intentTxHash(intentId), {
      method: "PATCH",
      body: { txnHash }
    });
  }
};
