import type { PaginationDto } from "../../../utils/ApiResponse";

type TransactionRecord = {
  _id?: unknown;
  amountUsdt?: number;
  createdAt?: Date | string | null;
  network?: string | null;
  notes?: string | null;
  payoutKind?: string | null;
  payoutLevel?: number | null;
  payoutPercent?: number | null;
  payoutPeriodEnd?: Date | string | null;
  payoutPeriodStart?: Date | string | null;
  payoutPrincipalUsdt?: number | null;
  payoutSourceTransactionId?: unknown;
  payoutSourceUserId?: unknown;
  payoutTier?: string | null;
  reviewedAt?: Date | string | null;
  status?: string;
  txnHash?: string | null;
  type?: string;
  walletAddress?: string | null;
  updatedAt?: Date | string | null;
};

export type TransactionDto = {
  id: string;
  type: string;
  status: string;
  amountUsdt: number;
  txnHash: string | null;
  network: string;
  walletAddress: string | null;
  notes: string;
  payoutKind: string | null;
  payoutLevel: number | null;
  payoutPercent: number | null;
  payoutPeriodEnd: Date | string | null;
  payoutPeriodStart: Date | string | null;
  payoutPrincipalUsdt: number | null;
  payoutSourceTransactionId: string | null;
  payoutSourceUserId: string | null;
  payoutTier: string | null;
  reviewedAt: Date | string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
};

export type ListTransactionsResponseDto = {
  transactions: TransactionDto[];
  pagination: PaginationDto;
};

export function cleanTransactionNotes(notes?: string | null): string {
  if (!notes) return "";
  return notes.replace(/Moralis verified/gi, "Tx verified");
}

export function toTransactionNode(record: TransactionRecord): TransactionDto {
  return {
    id: String(record._id),
    type: record.type ?? "adjustment",
    status: record.status ?? "pending",
    amountUsdt: record.amountUsdt ?? 0,
    txnHash: record.txnHash ?? null,
    network: record.network ?? "BEP20",
    walletAddress: record.walletAddress ?? null,
    notes: cleanTransactionNotes(record.notes),
    payoutKind: record.payoutKind ?? null,
    payoutLevel: record.payoutLevel ?? null,
    payoutPercent: record.payoutPercent ?? null,
    payoutPeriodEnd: record.payoutPeriodEnd ?? null,
    payoutPeriodStart: record.payoutPeriodStart ?? null,
    payoutPrincipalUsdt: record.payoutPrincipalUsdt ?? null,
    payoutSourceTransactionId: record.payoutSourceTransactionId
      ? String(record.payoutSourceTransactionId)
      : null,
    payoutSourceUserId: record.payoutSourceUserId ? String(record.payoutSourceUserId) : null,
    payoutTier: record.payoutTier ?? null,
    reviewedAt: record.reviewedAt ?? null,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  };
}
