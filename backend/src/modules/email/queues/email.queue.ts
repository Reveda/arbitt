import { Queue } from "bullmq";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { getBullMqConnectionOptions } from "../../../config/redis";
import type { EmailMessage } from "../types/email.types";

const QUEUE_NAME = "email-queue";

let emailQueue: Queue | null = null;

function shouldUseQueue() {
  return env.EMAIL_ENABLED && env.EMAIL_QUEUE_ENABLED && env.REDIS_ENABLED;
}

if (shouldUseQueue()) {
  try {
    emailQueue = new Queue(QUEUE_NAME, {
      connection: getBullMqConnectionOptions(),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
    logger.info("[BullMQ] Email Queue initialized successfully.");
  } catch (err) {
    logger.error({ err }, "[BullMQ] Failed to initialize Email Queue");
  }
}

export async function addEmailJob(message: EmailMessage) {
  if (!emailQueue) {
    logger.warn("[BullMQ] Email queue not available. Skipping enqueue.");
    return false;
  }

  try {
    const jobId = `${message.subject}:${message.to}:${message.contextLabel ?? "general"}`;
    const job = await emailQueue.add(
      "send-email",
      {
        ...message,
      },
      { jobId },
    );

    logger.info({ jobId: job.id, to: message.to, subject: message.subject }, "[BullMQ] Email job added");
    return true;
  } catch (err) {
    logger.error({ err }, "[BullMQ] Failed to add email job");
    return false;
  }
}

export function getEmailQueue() {
  return emailQueue;
}
