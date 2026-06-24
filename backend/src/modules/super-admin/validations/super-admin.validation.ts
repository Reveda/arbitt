import { z } from "zod";
import { USER_ROLES, USER_STATUSES } from "../../../constants/roles";
import { NOTIFICATION_TYPES } from "../../notifications/models/notification.model";
import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from "../../transactions/models/transaction.model";

const dateFilterSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .optional();

const paginatedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().trim().max(120).optional(),
});

const dateRangeQuerySchema = paginatedQuerySchema.extend({
  fromDate: dateFilterSchema,
  toDate: dateFilterSchema,
});

function withDateRangeValidation<T extends z.AnyZodObject>(schema: T) {
  return schema.refine(
    (query) => !query.fromDate || !query.toDate || query.fromDate <= query.toDate,
    {
      message: "To date must be same as or after from date.",
      path: ["toDate"],
    },
  );
}

export const listSuperAdminTransactionsQuerySchema = withDateRangeValidation(
  dateRangeQuerySchema.extend({
    status: z.enum(TRANSACTION_STATUSES).optional(),
    type: z.enum(TRANSACTION_TYPES).optional(),
  }),
);

export const listSuperAdminAuditLogsQuerySchema = withDateRangeValidation(
  dateRangeQuerySchema.extend({
    action: z.string().trim().max(120).optional(),
    entityType: z.string().trim().max(80).optional(),
  }),
);

export const listSuperAdminAdminsQuerySchema = paginatedQuerySchema.extend({
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
});

export const listSuperAdminSettingsQuerySchema = paginatedQuerySchema;

export const listSuperAdminNotificationsQuerySchema = withDateRangeValidation(
  dateRangeQuerySchema.extend({
    readStatus: z.enum(["read", "unread"]).optional(),
    type: z.enum(NOTIFICATION_TYPES).optional(),
  }),
);

export const listSuperAdminApiActivityQuerySchema = withDateRangeValidation(
  dateRangeQuerySchema.extend({
    action: z.string().trim().max(120).optional(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
    routeGroup: z.string().trim().max(80).optional(),
    statusCode: z.coerce.number().int().min(100).max(599).optional(),
    success: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  }),
);
