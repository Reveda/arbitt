import type { NextFunction, Request, Response } from "express";
import { allowedOrigins } from "../config/env";
import { HTTP_STATUS } from "../constants/http";
import { ApiError } from "../utils/ApiError";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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

  return next();
}
