import { z } from "zod";
import { USER_ROLES, USER_STATUSES } from "../../../constants/roles";
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
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional(),
});

export const listAdminReferralsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
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
    limit: z.coerce.number().int().min(1).max(10000).default(10),
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
    limit: z.coerce.number().int().min(1).max(10000).default(10),
    search: z.string().trim().max(120).optional(),
    status: z.enum(TRANSACTION_STATUSES).optional(),
    payoutKind: z.enum(["weekly", "level", "salary_royalty"]).optional(),
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
    limit: z.coerce.number().int().min(1).max(10000).default(10),
    search: z.string().trim().max(120).optional(),
    status: z.enum(TRANSACTION_STATUSES).optional(),
    fromDate: dateFilterSchema,
    toDate: dateFilterSchema,
  })
  .refine((query) => !query.fromDate || !query.toDate || query.fromDate <= query.toDate, {
    message: "To date must be same as or after from date.",
    path: ["toDate"],
  });

export const listAdminWithdrawalsQuerySchema = listAdminPlanPurchasesQuerySchema;

export const listAdminWalletsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional(),
});

export const adminPayoutParamsSchema = z.object({
  transactionId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid transaction id."),
});

export const adminPlanPurchaseParamsSchema = z.object({
  transactionId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid transaction id."),
});

export const adminWithdrawalParamsSchema = adminPlanPurchaseParamsSchema;

export const reviewAdminPayoutBodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(500).optional(),
});

export const reviewAdminPlanPurchaseBodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(500).optional(),
});

export const reviewAdminWithdrawalBodySchema = reviewAdminPlanPurchaseBodySchema;

export const generateAdminPayoutsBodySchema = z.object({
  weekStart: dateFilterSchema,
  payoutType: z.enum(["roi", "level", "royalty"]).default("roi"),
});

export const updateAdminPaymentWalletBodySchema = z.object({
  address: z
    .string()
    .trim()
    .min(8, "Wallet address is required.")
    .max(180, "Wallet address is too long."),
  network: z.enum(["BEP20"]),
  otp: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits."),
});

export const requestAdminPaymentWalletOtpBodySchema = z.object({
  address: z
    .string()
    .trim()
    .min(8, "Wallet address is required.")
    .max(180, "Wallet address is too long."),
  network: z.enum(["BEP20"]),
});

export const adminOverviewQuerySchema = z
  .object({
    fromDate: dateFilterSchema,
    toDate: dateFilterSchema,
  })
  .refine((query) => !query.fromDate || !query.toDate || query.fromDate <= query.toDate, {
    message: "To date must be same as or after from date.",
    path: ["toDate"],
  });

export const adminUserParamsSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user id."),
});

export const editAdminUserBodySchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(30, "Username cannot exceed 30 characters.")
    .optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
});
