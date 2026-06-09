import { Router } from "express";
import { requireAuth, requirePermissions } from "../../../middlewares/auth";
import { listNotifications } from "../controllers/notification.controller";

export const notificationRoutes = Router();

notificationRoutes.get(
  "/",
  requireAuth,
  requirePermissions("notifications:read"),
  listNotifications,
);
