import type { PaymentNetwork } from "../constants/payment-networks";

type PaymentIntentRecord = {
  _id?: unknown;
  amountUsdt?: number;
  amountTokenUnits?: string;
  chainId?: string;
  chainName?: string;
  confirmedAt?: Date | string | null;
  createdAt?: Date | string | null;
  detectedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  failureReason?: string | null;
  gasToken?: string;
  logIndex?: string | null;
  network?: PaymentNetwork | string;
  planName?: string;
  receiverAddress?: string;
  sourceTransactionId?: unknown;
  status?: string;
  tier?: string;
  tokenContract?: string;
  tokenDecimals?: number;
  tokenSymbol?: string;
  txnHash?: string | null;
  updatedAt?: Date | string | null;
  weeklyReturnPercent?: number;
};

export type PaymentIntentDto = {
  id: string;
  amountUsdt: number;
  amountTokenUnits: string;
  chainId: string;
  chainName: string;
  confirmedAt: Date | string | null;
  createdAt: Date | string | null;
  detectedAt: Date | string | null;
  expiresAt: Date | string | null;
  failureReason: string | null;
  gasToken: string;
  logIndex: string | null;
  network: string;
  planName: string;
  receiverAddress: string;
  sourceTransactionId: string | null;
  status: string;
  tier: string;
  tokenContract: string;
  tokenDecimals: number;
  tokenSymbol: string;
  txnHash: string | null;
  updatedAt: Date | string | null;
  weeklyReturnPercent: number;
};

export type CreatePlanPaymentIntentResponseDto = {
  intent: PaymentIntentDto;
};

export type CreateDepositPaymentIntentResponseDto = {
  intent: PaymentIntentDto;
};

export type GetPaymentIntentResponseDto = {
  intent: PaymentIntentDto;
};

export type SubmitPaymentIntentTxHashResponseDto = {
  intent: PaymentIntentDto;
};

export function toPaymentIntentDto(record: PaymentIntentRecord): PaymentIntentDto {
  const safeFailureReason = record.status === "failed"
    ? "Transaction verification failed. Please verify the amount, network and transaction hash, then contact support if needed."
    : null;

  return {
    id: String(record._id),
    amountUsdt: record.amountUsdt ?? 0,
    amountTokenUnits: record.amountTokenUnits ?? "0",
    chainId: record.chainId ?? "",
    chainName: record.chainName ?? "",
    confirmedAt: record.confirmedAt ?? null,
    createdAt: record.createdAt ?? null,
    detectedAt: record.detectedAt ?? null,
    expiresAt: record.expiresAt ?? null,
    failureReason: safeFailureReason,
    gasToken: record.gasToken ?? "",
    logIndex: record.logIndex ?? null,
    network: record.network ?? "",
    planName: record.planName ?? "",
    receiverAddress: record.receiverAddress ?? "",
    sourceTransactionId: record.sourceTransactionId ? String(record.sourceTransactionId) : null,
    status: record.status ?? "pending",
    tier: record.tier ?? "",
    tokenContract: record.tokenContract ?? "",
    tokenDecimals: record.tokenDecimals ?? 0,
    tokenSymbol: record.tokenSymbol ?? "USDT",
    txnHash: record.txnHash ?? null,
    updatedAt: record.updatedAt ?? null,
    weeklyReturnPercent: record.weeklyReturnPercent ?? 0,
  };
}
