import { Router } from "express";
import { requireAuth, requirePermissions, requireRoles } from "../../../middlewares/auth";
import { financialActionRateLimiter } from "../../../middlewares/rateLimiter";
import { validateRequest } from "../../../middlewares/validateRequest";
import {
  getAdminOverview,
  getAdminPaymentWallet,
  generateAdminPayouts,
  listAdminDeposits,
  listAdminPlanPurchases,
  listAdminPayouts,
  listAdminReferrals,
  listAdminUsers,
  listAdminWallets,
  reviewAdminPlanPurchase,
  reviewAdminPayout,
  updateAdminPaymentWallet,
} from "../controllers/admin.controller";
import {
  adminPlanPurchaseParamsSchema,
  adminPayoutParamsSchema,
  generateAdminPayoutsBodySchema,
  listAdminDepositsQuerySchema,
  listAdminPlanPurchasesQuerySchema,
  listAdminPayoutsQuerySchema,
  listAdminReferralsQuerySchema,
  listAdminUsersQuerySchema,
  listAdminWalletsQuerySchema,
  reviewAdminPlanPurchaseBodySchema,
  reviewAdminPayoutBodySchema,
  updateAdminPaymentWalletBodySchema,
} from "../validations/admin.validation";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRoles("admin", "super_admin"));
adminRoutes.get("/overview", requirePermissions("admin:overview:read"), getAdminOverview);
adminRoutes.get(
  "/users",
  requirePermissions("admin:users:manage"),
  validateRequest({ query: listAdminUsersQuerySchema }),
  listAdminUsers,
);
adminRoutes.get(
  "/wallets",
  requirePermissions("wallet:read"),
  validateRequest({ query: listAdminWalletsQuerySchema }),
  listAdminWallets,
);
adminRoutes.get(
  "/payment-wallet",
  requirePermissions("admin:settings:manage"),
  getAdminPaymentWallet,
);
adminRoutes.patch(
  "/payment-wallet",
  requirePermissions("admin:settings:manage"),
  financialActionRateLimiter,
  validateRequest({ body: updateAdminPaymentWalletBodySchema }),
  updateAdminPaymentWallet,
);
adminRoutes.get(
  "/deposits",
  requirePermissions("admin:deposits:review"),
  validateRequest({ query: listAdminDepositsQuerySchema }),
  listAdminDeposits,
);
adminRoutes.get(
  "/plan-purchases",
  requirePermissions("admin:plans:manage"),
  validateRequest({ query: listAdminPlanPurchasesQuerySchema }),
  listAdminPlanPurchases,
);
adminRoutes.patch(
  "/plan-purchases/:transactionId/review",
  requirePermissions("admin:plans:manage"),
  financialActionRateLimiter,
  validateRequest({
    params: adminPlanPurchaseParamsSchema,
    body: reviewAdminPlanPurchaseBodySchema,
  }),
  reviewAdminPlanPurchase,
);
adminRoutes.get(
  "/payouts",
  requirePermissions("admin:withdrawals:review"),
  validateRequest({ query: listAdminPayoutsQuerySchema }),
  listAdminPayouts,
);
adminRoutes.post(
  "/payouts/generate",
  requirePermissions("admin:withdrawals:review"),
  financialActionRateLimiter,
  validateRequest({ body: generateAdminPayoutsBodySchema }),
  generateAdminPayouts,
);
adminRoutes.patch(
  "/payouts/:transactionId/review",
  requirePermissions("admin:withdrawals:review"),
  financialActionRateLimiter,
  validateRequest({
    params: adminPayoutParamsSchema,
    body: reviewAdminPayoutBodySchema,
  }),
  reviewAdminPayout,
);
adminRoutes.get(
  "/referrals",
  requirePermissions("referrals:read"),
  validateRequest({ query: listAdminReferralsQuerySchema }),
  listAdminReferrals,
);
