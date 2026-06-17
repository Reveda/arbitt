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
  createSupportTicketSchema,
} from "../validations/user.validation";
import { createSupportTicket, listUserSupportTickets } from "../controllers/support.controller";

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

userRoutes.post(
  "/support/tickets",
  requireAuth,
  requirePermissions("profile:update"),
  validateRequest({ body: createSupportTicketSchema }),
  createSupportTicket,
);

userRoutes.get(
  "/support/tickets",
  requireAuth,
  requirePermissions("profile:read"),
  listUserSupportTickets,
);
