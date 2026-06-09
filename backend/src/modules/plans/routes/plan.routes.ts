import { Router } from "express";
import { env } from "../../../config/env";
import { requireAuth, requirePermissions, requireRoles } from "../../../middlewares/auth";
import { cacheResponse } from "../../../middlewares/cacheResponse";
import { financialActionRateLimiter } from "../../../middlewares/rateLimiter";
import { validateRequest } from "../../../middlewares/validateRequest";
import {
  getPlanRuleSet,
  listMyPlanPurchases,
  listPlans,
  purchasePlan,
} from "../controllers/plan.controller";
import { purchasePlanSchema } from "../validations/plan.validation";

export const planRoutes = Router();

planRoutes.get(
  "/",
  cacheResponse({ namespace: "plans:list", ttlSeconds: env.CACHE_PUBLIC_TTL_SECONDS }),
  listPlans,
);
planRoutes.get(
  "/rules",
  cacheResponse({ namespace: "plans:rules", ttlSeconds: env.CACHE_PUBLIC_TTL_SECONDS }),
  getPlanRuleSet,
);
planRoutes.get(
  "/purchases",
  requireAuth,
  requireRoles("user"),
  requirePermissions("plans:purchase"),
  listMyPlanPurchases,
);
planRoutes.post(
  "/purchases",
  requireAuth,
  requireRoles("user"),
  requirePermissions("plans:purchase"),
  financialActionRateLimiter,
  validateRequest({ body: purchasePlanSchema }),
  purchasePlan,
);
