import { Router } from "express";
import { requireAuth, requirePermissions, requireRoles } from "../../../middlewares/auth";
import { getDashboardMetrics, getEarnings } from "../controllers/report.controller";

export const reportRoutes = Router();

reportRoutes.get(
  "/dashboard",
  requireAuth,
  requireRoles("user"),
  requirePermissions("dashboard:read"),
  getDashboardMetrics,
);
reportRoutes.get(
  "/earnings",
  requireAuth,
  requireRoles("user"),
  requirePermissions("transactions:read"),
  getEarnings,
);
