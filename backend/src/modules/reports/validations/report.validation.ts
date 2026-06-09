import { z } from "zod";
import { TRANSACTION_STATUSES } from "../../transactions/models/transaction.model";

const dateFilterSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .optional();

export const listEarningsQuerySchema = z
  .object({
    fromDate: dateFilterSchema,
    kind: z.enum(["weekly", "level", "salary_royalty"]).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    page: z.coerce.number().int().min(1).default(1),
    status: z.enum(TRANSACTION_STATUSES).optional(),
    toDate: dateFilterSchema,
  })
  .refine((query) => !query.fromDate || !query.toDate || query.fromDate <= query.toDate, {
    message: "To date must be same as or after from date.",
    path: ["toDate"],
  });
