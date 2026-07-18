import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { allowedOrigins, env } from "../config/env";
import { HTTP_STATUS } from "../constants/http";
import { ApiError } from "../utils/ApiError";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_HEADER = "x-csrf-token";

function isAllowedOrigin(value: string) {
  try {
    return allowedOrigins.includes(new URL(value).origin);
  } catch {
    return false;
  }
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.get("origin");
  const referer = req.get("referer");

  // Non-browser clients normally omit both headers. Browser requests must identify
  // an allowed frontend origin before cookie-authenticated state can be changed.
  if (origin && !isAllowedOrigin(origin)) {
    return next(new ApiError(HTTP_STATUS.FORBIDDEN, "Request origin is not allowed."));
  }

  if (!origin && referer && !isAllowedOrigin(referer)) {
    return next(new ApiError(HTTP_STATUS.FORBIDDEN, "Request referrer is not allowed."));
  }

  const cookieToken = req.cookies?.[env.CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) {
    return next(new ApiError(HTTP_STATUS.FORBIDDEN, "CSRF token is required."));
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (cookieBuffer.length !== headerBuffer.length || !timingSafeEqual(cookieBuffer, headerBuffer)) {
    return next(new ApiError(HTTP_STATUS.FORBIDDEN, "Invalid CSRF token."));
  }

  return next();
}

export function issueCsrfToken(_req: Request, res: Response) {
  const token = randomBytes(32).toString("hex");
  const secure = env.COOKIE_SECURE ?? env.NODE_ENV === "production";

  res.cookie(env.CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/",
  });

  res.json({ success: true, data: { csrfToken: token } });
}
