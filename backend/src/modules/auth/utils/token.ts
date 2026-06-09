import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../../config/env";
import type { UserRole } from "../../../constants/roles";
import { addDuration } from "../../../utils/time";

type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  type: "access";
};

type RefreshTokenPayload = {
  sub: string;
  role: UserRole;
  sessionId: string;
  tokenVersion: number;
  type: "refresh";
};

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(user: { id: string; role: UserRole }) {
  const payload: AccessTokenPayload = {
    sub: user.id,
    role: user.role,
    type: "access",
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function signRefreshToken(input: {
  userId: string;
  role: UserRole;
  sessionId: string;
  tokenVersion: number;
}) {
  const payload: RefreshTokenPayload = {
    sub: input.userId,
    role: input.role,
    sessionId: input.sessionId,
    tokenVersion: input.tokenVersion,
    type: "refresh",
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export function getRefreshTokenExpiry() {
  return addDuration(new Date(), env.JWT_REFRESH_EXPIRES_IN);
}
