import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  refreshToken,
  register,
  requestEmailVerificationOtp,
  resetPassword,
  verifyEmail,
  checkUsernameAvailability,
} from "../controllers/auth.controller";
import {
  authIdentifierRateLimiter,
  authIpRateLimiter,
  otpIdentifierRateLimiter,
  otpIpRateLimiter,
  refreshTokenRateLimiter,
} from "../../../middlewares/rateLimiter";
import { validateRequest } from "../../../middlewares/validateRequest";
import {
  emailOtpRequestSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validations/auth.validation";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  authIpRateLimiter,
  authIdentifierRateLimiter,
  validateRequest({ body: registerSchema }),
  register,
);
authRoutes.post(
  "/login",
  authIpRateLimiter,
  authIdentifierRateLimiter,
  validateRequest({ body: loginSchema }),
  login,
);
authRoutes.post(
  "/forgot-password",
  otpIpRateLimiter,
  otpIdentifierRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  forgotPassword,
);
authRoutes.post(
  "/email-verification/request",
  otpIpRateLimiter,
  otpIdentifierRateLimiter,
  validateRequest({ body: emailOtpRequestSchema }),
  requestEmailVerificationOtp,
);
authRoutes.post(
  "/email-verification/verify",
  otpIpRateLimiter,
  otpIdentifierRateLimiter,
  validateRequest({ body: verifyEmailSchema }),
  verifyEmail,
);
authRoutes.post(
  "/reset-password",
  otpIpRateLimiter,
  otpIdentifierRateLimiter,
  validateRequest({ body: resetPasswordSchema }),
  resetPassword,
);
authRoutes.post("/refresh-token", refreshTokenRateLimiter, refreshToken);
authRoutes.post("/logout", logout);
authRoutes.get("/check-username", checkUsernameAvailability);
