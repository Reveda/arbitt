import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { HTTP_STATUS } from "../constants/http";
import { env } from "../config/env";
import type { UserRole } from "../constants/roles";
import { RoleModel, ROLE_PERMISSIONS } from "../modules/roles/models/role.model";
import { UserModel } from "../modules/users/models/user.model";
import { ApiError } from "../utils/ApiError";

export type RolePermission = (typeof ROLE_PERMISSIONS)[number];

export type AuthUser = {
  id: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  type?: "access";
};

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.cookies?.[env.ACCESS_TOKEN_COOKIE_NAME];

  if (!token) {
    return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, "Authentication token is required."));
  }

  let decoded: AccessTokenPayload;

  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (decoded.type !== "access") {
      return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid authentication token."));
    }
  } catch {
    return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid or expired authentication token."));
  }

  try {
    const user = await UserModel.findById(decoded.sub).select("role status").lean();

    if (!user) {
      return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, "User account no longer exists."));
    }

    if (user.status === "suspended") {
      return next(new ApiError(HTTP_STATUS.FORBIDDEN, "Your account is suspended."));
    }

    req.user = {
      id: String(user._id),
      role: user.role,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, "Authentication is required."));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(HTTP_STATUS.FORBIDDEN, "You do not have permission to access this resource."),
      );
    }

    return next();
  };
}

export function requirePermissions(...permissions: RolePermission[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, "Authentication is required."));
    }

    try {
      const role = await RoleModel.findOne({ name: req.user.role, isActive: true }).lean();

      if (!role) {
        return next(
          new ApiError(HTTP_STATUS.FORBIDDEN, "Your role is not active on this platform."),
        );
      }

      const grantedPermissions = new Set(role.permissions ?? []);
      const hasEveryPermission = permissions.every((permission) =>
        grantedPermissions.has(permission),
      );

      if (!hasEveryPermission) {
        return next(
          new ApiError(
            HTTP_STATUS.FORBIDDEN,
            "You do not have permission to access this resource.",
          ),
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
