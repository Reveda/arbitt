import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { ApiActivityModel } from "../modules/super-admin/models/api-activity.model";

function normalizePath(originalUrl: string) {
  const [path] = originalUrl.split("?");
  return path || "/";
}

function getRouteGroup(path: string) {
  const relativePath = path.startsWith(env.API_PREFIX) ? path.slice(env.API_PREFIX.length) : path;
  const [group] = relativePath.split("/").filter(Boolean);

  return group ?? "root";
}

function getAction(method: string, path: string) {
  const relativePath = path.startsWith(env.API_PREFIX) ? path.slice(env.API_PREFIX.length) : path;
  const segments = relativePath.split("/").filter(Boolean);
  const [group, resource, detail] = segments;

  if (group === "auth" && resource) {
    return `auth.${resource.replace(/-/g, "_")}`;
  }

  if (group === "admin" && resource) {
    return `admin.${resource.replace(/-/g, "_")}.${method.toLowerCase()}`;
  }

  if (group === "super-admin" && resource) {
    return `super_admin.${resource.replace(/-/g, "_")}.${method.toLowerCase()}`;
  }

  if (group === "wallet" && resource) {
    return `wallet.${resource.replace(/-/g, "_")}.${method.toLowerCase()}`;
  }

  if (group && resource && detail) {
    return `${group}.${resource.replace(/-/g, "_")}.${detail.replace(/-/g, "_")}`;
  }

  if (group && resource) {
    return `${group}.${resource.replace(/-/g, "_")}.${method.toLowerCase()}`;
  }

  return `${group ?? "root"}.${method.toLowerCase()}`;
}

function shouldSkipActivity(path: string, method: string, statusCode: number) {
  if (method === "OPTIONS") {
    return true;
  }

  if (path === "/" || path === `${env.API_PREFIX}/health`) {
    return true;
  }

  if (path === `${env.API_PREFIX}/auth/refresh-token` && statusCode < 400) {
    return true;
  }

  if (path.startsWith(`${env.API_PREFIX}/super-admin`) && statusCode < 400) {
    return true;
  }

  return false;
}

export function apiActivityTracker(req: Request, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const path = normalizePath(req.originalUrl);
    const method = req.method.toUpperCase();

    if (shouldSkipActivity(path, method, res.statusCode)) {
      return;
    }

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    ApiActivityModel.create({
      action: getAction(method, path),
      durationMs: Math.round(durationMs * 100) / 100,
      ipAddress: req.ip ?? "",
      method,
      path,
      routeGroup: getRouteGroup(path),
      statusCode: res.statusCode,
      success: res.statusCode < 400,
      userAgent: req.get("user-agent") ?? "",
      userId: req.user?.id ?? null,
      userRole: req.user?.role ?? null,
    }).catch((error) => {
      logger.warn({ error, path }, "API activity tracking failed");
    });
  });

  next();
}
