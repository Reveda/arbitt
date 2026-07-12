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
  listAdminWithdrawals,
  reviewAdminPlanPurchase,
  reviewAdminPayout,
  approveAllAdminPayouts,
  reviewAdminWithdrawal,
  updateAdminPaymentWallet,
  requestAdminPaymentWalletOtp,
  exportAdminPayouts,
  editAdminUser,
  deleteAdminUser,
  listAdminTransactions,
} from "../controllers/admin.controller";
import { listSuperAdminTransactionsQuerySchema } from "../../super-admin/validations/super-admin.validation";
import {
  listAdminSupportTickets,
  resolveSupportTicket,
} from "../controllers/admin-support.controller";
import {
  adminPlanPurchaseParamsSchema,
  adminPayoutParamsSchema,
  adminWithdrawalParamsSchema,
  generateAdminPayoutsBodySchema,
  listAdminDepositsQuerySchema,
  listAdminPlanPurchasesQuerySchema,
  listAdminPayoutsQuerySchema,
  listAdminReferralsQuerySchema,
  listAdminUsersQuerySchema,
  listAdminWalletsQuerySchema,
  listAdminWithdrawalsQuerySchema,
  reviewAdminPlanPurchaseBodySchema,
  reviewAdminPayoutBodySchema,
  reviewAdminWithdrawalBodySchema,
  updateAdminPaymentWalletBodySchema,
  requestAdminPaymentWalletOtpBodySchema,
  adminOverviewQuerySchema,
  adminUserParamsSchema,
  editAdminUserBodySchema,
} from "../validations/admin.validation";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRoles("admin", "super_admin"));
adminRoutes.get(
  "/overview",
  requirePermissions("admin:overview:read"),
  validateRequest({ query: adminOverviewQuerySchema }),
  getAdminOverview,
);
adminRoutes.get(
  "/users",
  requirePermissions("admin:users:manage"),
  validateRequest({ query: listAdminUsersQuerySchema }),
  listAdminUsers,
);
adminRoutes.patch(
  "/users/:userId",
  requirePermissions("admin:users:manage"),
  validateRequest({
    params: adminUserParamsSchema,
    body: editAdminUserBodySchema,
  }),
  editAdminUser,
);
adminRoutes.post(
  "/payment-wallet/verification",
  requirePermissions("admin:settings:manage"),
  financialActionRateLimiter,
  validateRequest({ body: requestAdminPaymentWalletOtpBodySchema }),
  requestAdminPaymentWalletOtp,
);
adminRoutes.delete(
  "/users/:userId",
  requirePermissions("admin:users:manage"),
  validateRequest({
    params: adminUserParamsSchema,
  }),
  deleteAdminUser,
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
  "/withdrawals",
  requirePermissions("admin:withdrawals:review"),
  validateRequest({ query: listAdminWithdrawalsQuerySchema }),
  listAdminWithdrawals,
);
adminRoutes.patch(
  "/withdrawals/:transactionId/review",
  requirePermissions("admin:withdrawals:review"),
  financialActionRateLimiter,
  validateRequest({
    params: adminWithdrawalParamsSchema,
    body: reviewAdminWithdrawalBodySchema,
  }),
  reviewAdminWithdrawal,
);
adminRoutes.get(
  "/payouts",
  requirePermissions("admin:withdrawals:review"),
  validateRequest({ query: listAdminPayoutsQuerySchema }),
  listAdminPayouts,
);
adminRoutes.get(
  "/payouts/export",
  requirePermissions("admin:withdrawals:review"),
  validateRequest({ query: listAdminPayoutsQuerySchema }),
  exportAdminPayouts,
);
adminRoutes.post(
  "/payouts/generate",
  requirePermissions("admin:withdrawals:review"),
  financialActionRateLimiter,
  validateRequest({ body: generateAdminPayoutsBodySchema }),
  generateAdminPayouts,
);
adminRoutes.post(
  "/payouts/approve-all",
  requirePermissions("admin:withdrawals:review"),
  financialActionRateLimiter,
  approveAllAdminPayouts,
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

adminRoutes.get(
  "/transactions",
  requirePermissions("transactions:read"),
  validateRequest({ query: listSuperAdminTransactionsQuerySchema }),
  listAdminTransactions,
);

adminRoutes.get(
  "/support/tickets",
  requirePermissions("admin:users:manage"),
  listAdminSupportTickets,
);

import {
  createAnnouncement,
  deleteAnnouncement
} from "../../notifications/controllers/announcement.controller";

adminRoutes.post(
  "/support/tickets/:id/resolve",
  requirePermissions("admin:users:manage"),
  resolveSupportTicket,
);

adminRoutes.post(
  "/announcements",
  requirePermissions("admin:users:manage"),
  createAnnouncement,
);

adminRoutes.delete(
  "/announcements/:id",
  requirePermissions("admin:users:manage"),
  deleteAnnouncement,
);
