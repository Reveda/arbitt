import type { Request, RequestHandler, Response } from "express";
import { createCacheKey, getCachedJson, setCachedJson } from "../utils/cache";

type CacheScope = "public" | "user";

type CachedResponse = {
  body: unknown;
  statusCode: number;
};

type CacheResponseOptions = {
  namespace: string;
  ttlSeconds: number;
  scope?: CacheScope;
};

function getScopePart(req: Request, scope: CacheScope) {
  if (scope === "public") {
    return "public";
  }

  return req.user ? `user:${req.user.id}:role:${req.user.role}` : "anonymous";
}

function shouldBypassCache(req: Request, ttlSeconds: number) {
  const cacheControl = req.get("cache-control") ?? "";

  return req.method !== "GET" || ttlSeconds <= 0 || cacheControl.includes("no-cache");
}

export function cacheResponse(options: CacheResponseOptions): RequestHandler {
  return async (req, res, next) => {
    if (shouldBypassCache(req, options.ttlSeconds)) {
      next();
      return;
    }

    const cacheKey = createCacheKey(options.namespace, [
      req.method,
      req.originalUrl,
      getScopePart(req, options.scope ?? "public"),
    ]);

    const cachedResponse = await getCachedJson<CachedResponse>(cacheKey);

    if (cachedResponse) {
      res.set("X-Cache", "HIT");
      res.status(cachedResponse.statusCode).json(cachedResponse.body);
      return;
    }

    const originalJson = res.json.bind(res);

    res.json = ((body?: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        void setCachedJson(
          cacheKey,
          {
            body,
            statusCode: res.statusCode,
          },
          options.ttlSeconds,
        );
      }

      res.set("X-Cache", "MISS");
      return originalJson(body);
    }) as Response["json"];

    next();
  };
}
