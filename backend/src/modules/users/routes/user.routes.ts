import { Router } from "express";
import { requireAuth, requirePermissions } from "../../../middlewares/auth";
import { validateRequest } from "../../../middlewares/validateRequest";
import {
  getCurrentUser,
  getUserProfile,
  requestWalletAddressChangeOtp,
  updateTransactionPassword,
  updateWalletAddress,
  verifyWalletAddressChangeOtp,
} from "../controllers/user.controller";
import {
  requestWalletAddressChangeOtpSchema,
  updateTransactionPasswordSchema,
  updateWalletAddressSchema,
  verifyWalletAddressChangeOtpSchema,
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
userRoutes.post(
  "/profile/wallet-address/request-otp",
  requireAuth,
  requirePermissions("profile:update"),
  validateRequest({ body: requestWalletAddressChangeOtpSchema }),
  requestWalletAddressChangeOtp,
);
userRoutes.post(
  "/profile/wallet-address/verify-otp",
  requireAuth,
  requirePermissions("profile:update"),
  validateRequest({ body: verifyWalletAddressChangeOtpSchema }),
  verifyWalletAddressChangeOtp,
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
