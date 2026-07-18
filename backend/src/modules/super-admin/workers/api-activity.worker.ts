import { Worker, type Job } from "bullmq";
import { env } from "../../../config/env";
import { getBullMqConnectionOptions } from "../../../config/redis";
import { logger } from "../../../config/logger";
import { ApiActivityModel } from "../models/api-activity.model";
import type { ApiActivityEvent } from "../queues/api-activity.queue";

const QUEUE_NAME = "api-activity-queue";
const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 250;

export function createApiActivityWorker() {
  if (!env.REDIS_ENABLED || !env.API_ACTIVITY_TRACKING_ENABLED) {
    logger.info("[BullMQ Worker] API activity worker disabled");
    return null;
  }

  type PendingJob = {
    event: ApiActivityEvent;
    resolve: () => void;
    reject: (error: unknown) => void;
  };

  const pending: PendingJob[] = [];
  let flushing = false;

  const flush = async () => {
    if (flushing || pending.length === 0) return;
    flushing = true;
    const batch = pending.splice(0, BATCH_SIZE);

    try {
      await ApiActivityModel.insertMany(batch.map((entry) => entry.event), { ordered: false });
      batch.forEach((entry) => entry.resolve());
    } catch (error) {
      batch.forEach((entry) => entry.reject(error));
      throw error;
    } finally {
      flushing = false;
      if (pending.length >= BATCH_SIZE) void flush();
    }
  };

  const timer = setInterval(() => void flush().catch((error) => {
    logger.error({ error }, "[BullMQ Worker] API activity batch insert failed");
  }), FLUSH_INTERVAL_MS);

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job<ApiActivityEvent>) => {
      await new Promise<void>((resolve, reject) => {
        pending.push({ event: job.data, resolve, reject });
        if (pending.length >= BATCH_SIZE) void flush().catch(() => undefined);
      });
    },
    {
      connection: getBullMqConnectionOptions(),
      concurrency: 50,
    },
  );

  worker.on("error", (error) => logger.error({ error }, "[BullMQ Worker] API activity worker error"));
  worker.on("closing", () => clearInterval(timer));
  logger.info("[BullMQ Worker] API activity worker initialized");
  return worker;
}
