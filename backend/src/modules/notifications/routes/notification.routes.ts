import { Router } from "express";
import { requireAuth, requirePermissions } from "../../../middlewares/auth";
import { listNotifications } from "../controllers/notification.controller";
import { listAnnouncements } from "../controllers/announcement.controller";

export const notificationRoutes = Router();

notificationRoutes.get(
  "/",
  requireAuth,
  requirePermissions("notifications:read"),
  listNotifications,
);

notificationRoutes.get(
  "/announcements",
  requireAuth,
  listAnnouncements,
);
