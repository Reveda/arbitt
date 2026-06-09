import { Router } from "express";
import { requireAuth, requirePermissions, requireRoles } from "../../../middlewares/auth";
import { validateRequest } from "../../../middlewares/validateRequest";
import {
  getSuperAdminOverview,
  listSuperAdminAdmins,
  listSuperAdminApiActivity,
  listSuperAdminAuditLogs,
  listSuperAdminNotifications,
  listSuperAdminSettings,
  listSuperAdminTransactions,
} from "../controllers/super-admin.controller";
import {
  listSuperAdminAdminsQuerySchema,
  listSuperAdminApiActivityQuerySchema,
  listSuperAdminAuditLogsQuerySchema,
  listSuperAdminNotificationsQuerySchema,
  listSuperAdminSettingsQuerySchema,
  listSuperAdminTransactionsQuerySchema,
} from "../validations/super-admin.validation";

export const superAdminRoutes = Router();

superAdminRoutes.use(requireAuth, requireRoles("super_admin"));
superAdminRoutes.get(
  "/overview",
  requirePermissions("super_admin:security:manage"),
  getSuperAdminOverview,
);
superAdminRoutes.get(
  "/transactions",
  requirePermissions("transactions:read"),
  validateRequest({ query: listSuperAdminTransactionsQuerySchema }),
  listSuperAdminTransactions,
);
superAdminRoutes.get(
  "/audit-logs",
  requirePermissions("super_admin:audit_logs:read"),
  validateRequest({ query: listSuperAdminAuditLogsQuerySchema }),
  listSuperAdminAuditLogs,
);
superAdminRoutes.get(
  "/api-activity",
  requirePermissions("super_admin:audit_logs:read"),
  validateRequest({ query: listSuperAdminApiActivityQuerySchema }),
  listSuperAdminApiActivity,
);
superAdminRoutes.get(
  "/admins",
  requirePermissions("super_admin:admins:manage"),
  validateRequest({ query: listSuperAdminAdminsQuerySchema }),
  listSuperAdminAdmins,
);
superAdminRoutes.get(
  "/settings",
  requirePermissions("super_admin:platform_settings:manage"),
  validateRequest({ query: listSuperAdminSettingsQuerySchema }),
  listSuperAdminSettings,
);
superAdminRoutes.get(
  "/notifications",
  requirePermissions("notifications:read"),
  validateRequest({ query: listSuperAdminNotificationsQuerySchema }),
  listSuperAdminNotifications,
);
