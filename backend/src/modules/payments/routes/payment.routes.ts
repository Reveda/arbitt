import { Router } from "express";
import { requireAuth, requirePermissions, requireRoles } from "../../../middlewares/auth";
import { financialActionRateLimiter } from "../../../middlewares/rateLimiter";
import { validateRequest } from "../../../middlewares/validateRequest";
import {
  createDepositPaymentIntent,
  createPlanPaymentIntent,
  getPaymentIntent,
  submitPaymentIntentTxHash,
} from "../controllers/payment.controller";
import {
  createDepositPaymentIntentSchema,
  createPlanPaymentIntentSchema,
  submitPaymentIntentTxHashSchema,
} from "../validations/payment.validation";

export const paymentRoutes = Router();

paymentRoutes.use(requireAuth, requireRoles("user"));
paymentRoutes.post(
  "/deposit-intents",
  requirePermissions("wallet:deposit:create"),
  financialActionRateLimiter,
  validateRequest({ body: createDepositPaymentIntentSchema }),
  createDepositPaymentIntent,
);
paymentRoutes.post(
  "/plan-intents",
  requirePermissions("plans:purchase"),
  financialActionRateLimiter,
  validateRequest({ body: createPlanPaymentIntentSchema }),
  createPlanPaymentIntent,
);
paymentRoutes.get(
  "/intents/:intentId",
  requirePermissions("payments:intents:manage"),
  getPaymentIntent,
);
paymentRoutes.patch(
  "/intents/:intentId/tx-hash",
  requirePermissions("payments:intents:manage"),
  financialActionRateLimiter,
  validateRequest({ body: submitPaymentIntentTxHashSchema }),
  submitPaymentIntentTxHash,
);
