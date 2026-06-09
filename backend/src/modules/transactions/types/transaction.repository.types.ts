export type TransactionRepositoryRecord = {
  _id?: unknown;
  userId?: unknown;
  type?: string;
  status?: string;
  amountUsdt?: number;
  txnHash?: string | null;
  network?: string | null;
  notes?: string | null;
  reviewedBy?: unknown;
  reviewedAt?: Date | string | null;
  payoutKind?: string | null;
  payoutLevel?: number | null;
  payoutSourceTransactionId?: unknown;
  payoutSourceUserId?: unknown;
  payoutPeriodStart?: Date | string | null;
  payoutPeriodEnd?: Date | string | null;
  payoutTier?: string | null;
  payoutPercent?: number | null;
  payoutPrincipalUsdt?: number | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

export type UserTransactionListResult = {
  transactions: TransactionRepositoryRecord[];
  total: number;
};
