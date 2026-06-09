import { Router } from "express";
import { requireAuth, requirePermissions, requireRoles } from "../../../middlewares/auth";
import { listRoles } from "../controllers/role.controller";

export const roleRoutes = Router();

roleRoutes.get(
  "/",
  requireAuth,
  requireRoles("admin", "super_admin"),
  requirePermissions("admin:settings:manage"),
  listRoles,
);
