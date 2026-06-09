import type { CookieOptions, Response } from "express";
import { env } from "../../../config/env";
import { durationToMs } from "../../../utils/time";

type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

const isSecureCookie = env.COOKIE_SECURE ?? env.NODE_ENV === "production";

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/",
  };
}

export function setAuthCookies(res: Response, tokens: AuthTokens) {
  res.cookie(env.ACCESS_TOKEN_COOKIE_NAME, tokens.accessToken, {
    ...baseCookieOptions(),
    maxAge: durationToMs(env.JWT_ACCESS_EXPIRES_IN),
  });

  if (tokens.refreshToken) {
    res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, {
      ...baseCookieOptions(),
      maxAge: durationToMs(env.JWT_REFRESH_EXPIRES_IN),
    });
  }
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(env.ACCESS_TOKEN_COOKIE_NAME, baseCookieOptions());
  res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, baseCookieOptions());
}
