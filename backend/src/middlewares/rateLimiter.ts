import type { Request } from "express";
import rateLimit, { Store, IncrementResponse, Options, MemoryStore } from "express-rate-limit";
import { env } from "../config/env";
import { getRedisClient } from "../config/redis";
import { logger } from "../config/logger";

const normalizedPrefix = env.CACHE_KEY_PREFIX.replace(/:+$/u, "");

class RedisStoreWithFallback implements Store {
  private windowMs!: number;
  prefix: string;
  private memoryStore: Store;

  constructor(prefix: string) {
    this.prefix = prefix;
    this.memoryStore = new MemoryStore();
  }

  async init(options: Options) {
    this.windowMs = options.windowMs;
    if (this.memoryStore.init) {
      await this.memoryStore.init(options);
    }
  }

  async increment(key: string): Promise<IncrementResponse> {
    const client = getRedisClient();
    if (!client) {
      return this.memoryStore.increment(key);
    }

    try {
      const prefixedKey = `${normalizedPrefix}:limiter:${this.prefix}:${key}`;
      const expireSeconds = Math.ceil(this.windowMs / 1000);

      const [totalHits, , ttl] = (await client
        .multi()
        .incr(prefixedKey)
        .expire(prefixedKey, expireSeconds, "NX")
        .ttl(prefixedKey)
        .exec()) as unknown as [number, boolean, number];

      const resetTime = new Date(Date.now() + (ttl > 0 ? ttl : expireSeconds) * 1000);
      return {
        totalHits,
        resetTime,
      };
    } catch (error) {
      logger.warn({ error, key }, "Redis rate limiter error, falling back to memory store");
      return this.memoryStore.increment(key);
    }
  }

  async decrement(key: string): Promise<void> {
    const client = getRedisClient();
    if (!client) {
      if (this.memoryStore.decrement) {
        await this.memoryStore.decrement(key);
      }
      return;
    }

    try {
      const prefixedKey = `${normalizedPrefix}:limiter:${this.prefix}:${key}`;
      await client.decr(prefixedKey);
    } catch (error) {
      logger.warn(
        { error, key },
        "Redis rate limiter decrement error, falling back to memory store",
      );
      if (this.memoryStore.decrement) {
        await this.memoryStore.decrement(key);
      }
    }
  }

  async resetKey(key: string): Promise<void> {
    const client = getRedisClient();
    if (!client) {
      await this.memoryStore.resetKey(key);
      return;
    }

    try {
      const prefixedKey = `${normalizedPrefix}:limiter:${this.prefix}:${key}`;
      await client.del(prefixedKey);
    } catch (error) {
      logger.warn(
        { error, key },
        "Redis rate limiter resetKey error, falling back to memory store",
      );
      await this.memoryStore.resetKey(key);
    }
  }
}

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
    store: new RedisStoreWithFallback(input.identifier),
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
