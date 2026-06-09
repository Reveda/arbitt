import { createClient, type RedisClientType } from "redis";
import { env } from "./env";
import { logger } from "./logger";

type RedisCacheStatus = "disabled" | "ready" | "unavailable";

let redisClient: RedisClientType | null = null;
let redisStatus: RedisCacheStatus = env.REDIS_ENABLED ? "unavailable" : "disabled";

function createRedisClient() {
  const client = createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: 2000,
      reconnectStrategy: false,
    },
  });

  client.on("error", (error) => {
    redisStatus = "unavailable";
    logger.warn({ error }, "Redis cache client error");
  });

  client.on("ready", () => {
    redisStatus = "ready";
  });

  client.on("end", () => {
    redisStatus = env.REDIS_ENABLED ? "unavailable" : "disabled";
  });

  return client;
}

export async function connectRedis() {
  if (!env.REDIS_ENABLED) {
    redisStatus = "disabled";
    logger.debug("Redis cache disabled");
    return;
  }

  if (redisClient?.isReady) {
    redisStatus = "ready";
    return;
  }

  redisClient ??= createRedisClient();

  try {
    await redisClient.connect();
    redisStatus = redisClient.isReady ? "ready" : "unavailable";
    logger.info({ url: env.REDIS_URL }, "Redis cache connected");
  } catch (error) {
    redisStatus = "unavailable";
    logger.warn({ error }, "Redis cache unavailable; continuing without cache");
    redisClient.destroy();
    redisClient = null;
  }
}

export async function disconnectRedis() {
  if (!redisClient) {
    return;
  }

  try {
    if (redisClient.isOpen) {
      await redisClient.close();
    }
  } catch (error) {
    logger.warn({ error }, "Failed to close Redis cache connection");
  } finally {
    redisClient = null;
    redisStatus = env.REDIS_ENABLED ? "unavailable" : "disabled";
  }
}

export function getRedisClient() {
  if (!env.REDIS_ENABLED || !redisClient?.isReady) {
    return null;
  }

  return redisClient;
}

export function getRedisCacheStatus() {
  return redisStatus;
}
