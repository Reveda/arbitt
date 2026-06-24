import { z } from "zod";
import { TRANSACTION_STATUSES, TRANSACTION_TYPES } from "../models/transaction.model";

const dateFilterSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .optional();

export const listTransactionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
    type: z.enum(TRANSACTION_TYPES).optional(),
    status: z.enum(TRANSACTION_STATUSES).optional(),
    fromDate: dateFilterSchema,
    toDate: dateFilterSchema,
  })
  .refine((query) => !query.fromDate || !query.toDate || query.fromDate <= query.toDate, {
    message: "To date must be same as or after from date.",
    path: ["toDate"],
  });
