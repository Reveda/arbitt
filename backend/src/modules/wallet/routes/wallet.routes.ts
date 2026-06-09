import { Router } from "express";
import { requireAuth, requirePermissions, requireRoles } from "../../../middlewares/auth";
import { financialActionRateLimiter } from "../../../middlewares/rateLimiter";
import { validateRequest } from "../../../middlewares/validateRequest";
import {
  createDepositRequest,
  createWithdrawalRequest,
  getWalletSummary,
  listDepositRequests,
} from "../controllers/wallet.controller";
import { createDepositRequestSchema } from "../validations/wallet.validation";

export const walletRoutes = Router();

walletRoutes.use(requireAuth, requireRoles("user"));
walletRoutes.get("/summary", requirePermissions("wallet:read"), getWalletSummary);
walletRoutes.get("/deposits", requirePermissions("wallet:read"), listDepositRequests);
walletRoutes.post(
  "/deposits",
  requirePermissions("wallet:deposit:create"),
  financialActionRateLimiter,
  validateRequest({ body: createDepositRequestSchema }),
  createDepositRequest,
);
walletRoutes.post(
  "/withdrawals",
  requirePermissions("wallet:withdrawal:create"),
  financialActionRateLimiter,
  createWithdrawalRequest,
);
