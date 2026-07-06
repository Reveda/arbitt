import { Router } from "express";
import { getLandingContent, updateLandingContent, submitContactMessage } from "../controllers/landing.controller";
import { requireAuth, requireRoles } from "../../../middlewares/auth";

export const landingRoutes = Router();

landingRoutes.get("/", getLandingContent);
landingRoutes.put("/", requireAuth, requireRoles("super_admin"), updateLandingContent);
landingRoutes.post("/contact", submitContactMessage);
