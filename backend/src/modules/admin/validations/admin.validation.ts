import { z } from "zod";
import { USER_STATUSES } from "../../../constants/roles";
import { TRANSACTION_STATUSES } from "../../transactions/models/transaction.model";

const dateFilterSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .optional();

const booleanQuerySchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

export const listAdminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(120).optional(),
});

export const listAdminReferralsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(120).optional(),
  parentUserId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid parent user id.")
    .optional(),
  rootOnly: booleanQuerySchema,
  level: z.coerce.number().int().min(0).max(100).optional(),
  status: z.enum(USER_STATUSES).optional(),
});

export const listAdminDepositsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    search: z.string().trim().max(120).optional(),
    status: z.enum(TRANSACTION_STATUSES).optional(),
    fromDate: dateFilterSchema,
    toDate: dateFilterSchema,
  })
  .refine((query) => !query.fromDate || !query.toDate || query.fromDate <= query.toDate, {
    message: "To date must be same as or after from date.",
    path: ["toDate"],
  });

export const listAdminPayoutsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    search: z.string().trim().max(120).optional(),
    status: z.enum(TRANSACTION_STATUSES).optional(),
    fromDate: dateFilterSchema,
    weekStart: dateFilterSchema,
    toDate: dateFilterSchema,
  })
  .refine((query) => !query.fromDate || !query.toDate || query.fromDate <= query.toDate, {
    message: "To date must be same as or after from date.",
    path: ["toDate"],
  });

export const listAdminPlanPurchasesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    search: z.string().trim().max(120).optional(),
    status: z.enum(TRANSACTION_STATUSES).optional(),
    fromDate: dateFilterSchema,
    toDate: dateFilterSchema,
  })
  .refine((query) => !query.fromDate || !query.toDate || query.fromDate <= query.toDate, {
    message: "To date must be same as or after from date.",
    path: ["toDate"],
  });

export const listAdminWalletsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(120).optional(),
});

export const adminPayoutParamsSchema = z.object({
  transactionId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid transaction id."),
});

export const adminPlanPurchaseParamsSchema = z.object({
  transactionId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid transaction id."),
});

export const reviewAdminPayoutBodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(500).optional(),
});

export const reviewAdminPlanPurchaseBodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(500).optional(),
});

export const generateAdminPayoutsBodySchema = z.object({
  weekStart: dateFilterSchema,
  returnStrategy: z.enum(["min", "average", "max"]).default("min"),
});

export const updateAdminPaymentWalletBodySchema = z.object({
  address: z
    .string()
    .trim()
    .min(8, "Wallet address is required.")
    .max(180, "Wallet address is too long."),
  network: z.enum(["BEP20", "Arbitrum"]),
});
