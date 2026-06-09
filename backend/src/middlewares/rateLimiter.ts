import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

type RateLimiterInput = {
  identifier: string;
  limit: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  windowMs: number;
  keyGenerator?: (request: Request) => string;
};

function createRateLimiter(input: RateLimiterInput) {
  return rateLimit({
    identifier: input.identifier,
    windowMs: input.windowMs,
    limit: input.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: input.skipSuccessfulRequests ?? false,
    skip: (request) => request.method === "OPTIONS",
    ...(input.keyGenerator ? { keyGenerator: input.keyGenerator } : {}),
    message: {
      statusCode: 429,
      success: false,
      message: input.message,
    },
  });
}

function getEmailKey(scope: string) {
  return (request: Request) => {
    const email =
      typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";

    return email ? `${scope}:email:${email}` : `${scope}:ip:${request.ip ?? "unknown"}`;
  };
}

export const apiRateLimiter = createRateLimiter({
  identifier: "api-general",
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  limit: env.API_RATE_LIMIT_MAX,
  message: "Too many API requests. Please slow down and try again shortly.",
});

export const authIpRateLimiter = createRateLimiter({
  identifier: "auth-ip",
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  message: "Too many authentication attempts. Please try again later.",
});

export const authIdentifierRateLimiter = createRateLimiter({
  identifier: "auth-identifier",
  windowMs: env.AUTH_IDENTIFIER_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_IDENTIFIER_RATE_LIMIT_MAX,
  keyGenerator: getEmailKey("auth"),
  skipSuccessfulRequests: true,
  message: "Too many attempts for this account. Please try again later.",
});

export const otpIpRateLimiter = createRateLimiter({
  identifier: "otp-ip",
  windowMs: env.OTP_RATE_LIMIT_WINDOW_MS,
  limit: env.OTP_RATE_LIMIT_MAX,
  message: "Too many OTP requests. Please wait before trying again.",
});

export const otpIdentifierRateLimiter = createRateLimiter({
  identifier: "otp-identifier",
  windowMs: env.OTP_RATE_LIMIT_WINDOW_MS,
  limit: env.OTP_RATE_LIMIT_MAX,
  keyGenerator: getEmailKey("otp"),
  message: "Too many OTP requests for this account. Please wait before trying again.",
});

export const refreshTokenRateLimiter = createRateLimiter({
  identifier: "refresh-token",
  windowMs: env.REFRESH_RATE_LIMIT_WINDOW_MS,
  limit: env.REFRESH_RATE_LIMIT_MAX,
  message: "Too many session refresh requests. Please try again shortly.",
});

export const financialActionRateLimiter = createRateLimiter({
  identifier: "financial-action",
  windowMs: env.FINANCIAL_RATE_LIMIT_WINDOW_MS,
  limit: env.FINANCIAL_RATE_LIMIT_MAX,
  message: "Too many financial actions. Please wait and try again.",
});
