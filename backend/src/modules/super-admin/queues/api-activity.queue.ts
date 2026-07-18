import { Queue } from "bullmq";
import { env } from "../../../config/env";
import { getBullMqConnectionOptions } from "../../../config/redis";
import { logger } from "../../../config/logger";

const QUEUE_NAME = "api-activity-queue";

export type ApiActivityEvent = {
  action: string;
  durationMs: number;
  ipAddress: string;
  method: string;
  path: string;
  routeGroup: string;
  statusCode: number;
  success: boolean;
  userAgent: string;
  userId: string | null;
  userRole: string | null;
};

let apiActivityQueue: Queue | null = null;

if (env.REDIS_ENABLED && env.API_ACTIVITY_TRACKING_ENABLED) {
  apiActivityQueue = new Queue(QUEUE_NAME, {
    connection: getBullMqConnectionOptions(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    },
  });
  logger.info("[BullMQ] API activity queue initialized");
}

export async function addApiActivityJob(activity: ApiActivityEvent) {
  if (!apiActivityQueue) {
    return false;
  }

  await apiActivityQueue.add("record-api-activity", activity);
  return true;
}

export { apiActivityQueue };
