import { Router } from "express";
import { requireAuth, requirePermissions } from "../../../middlewares/auth";
import { validateRequest } from "../../../middlewares/validateRequest";
import {
  getCurrentUser,
  getUserProfile,
  updateTransactionPassword,
  updateWalletAddress,
} from "../controllers/user.controller";
import {
  updateTransactionPasswordSchema,
  updateWalletAddressSchema,
} from "../validations/user.validation";

export const userRoutes = Router();

userRoutes.get("/me", requireAuth, requirePermissions("profile:read"), getCurrentUser);
userRoutes.get("/profile", requireAuth, requirePermissions("profile:read"), getUserProfile);
userRoutes.patch(
  "/profile/wallet-address",
  requireAuth,
  requirePermissions("profile:update"),
  validateRequest({ body: updateWalletAddressSchema }),
  updateWalletAddress,
);
userRoutes.patch(
  "/profile/transaction-password",
  requireAuth,
  requirePermissions("profile:update"),
  validateRequest({ body: updateTransactionPasswordSchema }),
  updateTransactionPassword,
);
