import { createHash } from "node:crypto";
import { env } from "../config/env";
import { getRedisClient } from "../config/redis";
import { logger } from "../config/logger";

const normalizedPrefix = env.CACHE_KEY_PREFIX.replace(/:+$/u, "");

function withPrefix(key: string) {
  return `${normalizedPrefix}:${key}`;
}

export function createCacheKey(namespace: string, parts: unknown[]) {
  const digest = createHash("sha256").update(JSON.stringify(parts)).digest("hex");
  return `${namespace}:${digest}`;
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const client = getRedisClient();

  if (!client) {
    return null;
  }

  try {
    const rawValue = await client.get(withPrefix(key));

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  } catch (error) {
    logger.warn({ error, key }, "Failed to read Redis cache");
    return null;
  }
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds: number) {
  const client = getRedisClient();

  if (!client || ttlSeconds <= 0) {
    return;
  }

  try {
    await client.set(withPrefix(key), JSON.stringify(value), {
      EX: ttlSeconds,
    });
  } catch (error) {
    logger.warn({ error, key }, "Failed to write Redis cache");
  }
}
