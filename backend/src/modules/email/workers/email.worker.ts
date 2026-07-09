import { Worker, type Job } from "bullmq";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { getBullMqConnectionOptions } from "../../../config/redis";
import { getEmailFromAddress, getEmailTransporter } from "../services/email.transport";
import type { EmailMessage } from "../types/email.types";

const QUEUE_NAME = "email-queue";

export function createEmailWorker(): Worker | null {
  if (!env.EMAIL_ENABLED || !env.EMAIL_QUEUE_ENABLED || !env.REDIS_ENABLED) {
    logger.info("[BullMQ Worker] Email worker not started.");
    return null;
  }

  try {
    const emailWorker = new Worker(
      QUEUE_NAME,
      async (job: Job<EmailMessage>) => {
        const message = job.data;

        await getEmailTransporter().sendMail({
          from: getEmailFromAddress(),
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
        });

        logger.info(
          { jobId: job.id, to: message.to, subject: message.subject },
          "[BullMQ Worker] Email sent",
        );
      },
      {
        connection: getBullMqConnectionOptions(),
        concurrency: env.EMAIL_QUEUE_CONCURRENCY,
      },
    );

    emailWorker.on("failed", (job, err) => {
      if (!job) {
        return;
      }

      logger.error(
        { jobId: job.id, to: job.data.to, subject: job.data.subject, error: err.message },
        "[BullMQ Worker] Email job failed",
      );
    });

    logger.info("[BullMQ Worker] Email worker initialized successfully.");
    return emailWorker;
  } catch (err) {
    logger.error({ err }, "[BullMQ Worker] Failed to initialize email worker");
    return null;
  }
}
