import { Queue } from "bullmq";
import { env } from "../../../config/env";
import { getBullMqConnectionOptions } from "../../../config/redis";
import { logger } from "../../../config/logger";

const QUEUE_NAME = "withdrawal-queue";

let withdrawalQueue: Queue | null = null;

if (env.REDIS_ENABLED) {
  try {
    withdrawalQueue = new Queue(QUEUE_NAME, {
      connection: getBullMqConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 10000, // 10 seconds retry delay initial
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
    logger.info(`[BullMQ] Withdrawal Queue initialized successfully.`);
  } catch (err) {
    logger.error(`[BullMQ] Failed to initialize Withdrawal Queue: ${err}`);
  }
}

export async function addWithdrawalJob(
  withdrawalId: string,
  toAddress: string,
  netAmountUsdt: number,
  grossAmountUsdt: number,
) {
  if (!withdrawalQueue) {
    logger.warn(`[BullMQ] Redis/Queue not enabled. Skipping background job enqueue.`);
    return false;
  }

  try {
    const job = await withdrawalQueue.add(
      "process-withdrawal",
      { withdrawalId, toAddress, netAmountUsdt, grossAmountUsdt },
      { jobId: withdrawalId }, // Prevent duplicate processing of the same withdrawal
    );
    logger.info(
      `[BullMQ] Withdrawal job added to queue. JobID: ${job.id}, WithdrawalID: ${withdrawalId}`,
    );
    return true;
  } catch (err) {
    logger.error(`[BullMQ] Failed to add withdrawal job: ${err}`);
    return false;
  }
}

export { withdrawalQueue };
