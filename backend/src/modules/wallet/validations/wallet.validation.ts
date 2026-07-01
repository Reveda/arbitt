import { z } from "zod";
import { TRANSACTION_STATUSES } from "../../transactions/models/transaction.model";

const dateFilterSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .optional();

const optionalText = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : undefined;
  }, z.string().max(maxLength).optional());

export const createDepositRequestSchema = z.object({
  amountUsdt: z.coerce
    .number()
    .positive("Deposit amount must be greater than 0.")
    .min(100, "Minimum deposit amount is 100 USDT.")
    .max(50000, "Maximum deposit amount is 50000 USDT."),
  network: z.enum(["APP", "BEP20"]).default("APP"),
  notes: optionalText(500),
  txnHash: optionalText(180),
});

export const createWithdrawalRequestSchema = z.object({
  amountUsdt: z.coerce
    .number()
    .positive("Withdrawal amount must be greater than 0.")
    .min(10, "Minimum withdrawal amount is 10 USDT.")
    .max(50000, "Maximum withdrawal amount is 50000 USDT."),
  network: z.enum(["BEP20"]).default("BEP20"),
  walletAddress: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid BEP20 wallet address."),
  transactionPassword: z
    .string({ required_error: "Transaction password is required." })
    .trim()
    .min(6, "Transaction password must be at least 6 characters."),
  notes: optionalText(500),
});

export const listDepositRequestsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(TRANSACTION_STATUSES).optional(),
    fromDate: dateFilterSchema,
    toDate: dateFilterSchema,
  })
  .refine((query) => !query.fromDate || !query.toDate || query.fromDate <= query.toDate, {
    message: "To date must be same as or after from date.",
    path: ["toDate"],
  });
