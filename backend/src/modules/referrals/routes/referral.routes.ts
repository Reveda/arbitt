import { Router } from "express";
import { requireAuth, requirePermissions, requireRoles } from "../../../middlewares/auth";
import {
  getReferralSummary,
  getReferralTree,
  listReferralMembers,
} from "../controllers/referral.controller";

export const referralRoutes = Router();

referralRoutes.use(requireAuth, requireRoles("user"));
referralRoutes.get("/summary", requirePermissions("referrals:read"), getReferralSummary);
referralRoutes.get("/members", requirePermissions("referrals:read"), listReferralMembers);
referralRoutes.get("/tree", requirePermissions("referrals:read"), getReferralTree);
