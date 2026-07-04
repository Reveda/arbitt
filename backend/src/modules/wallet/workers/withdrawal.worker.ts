import { Worker, type Job } from "bullmq";
import { getBullMqConnectionOptions } from "../../../config/redis";
import { logger } from "../../../config/logger";
import { TransactionModel } from "../../transactions/models/transaction.model";
import { blockchainService } from "../services/blockchain.service";
import { walletRepository } from "../repositories/wallet.repository";
import { env } from "../../../config/env";

const QUEUE_NAME = "withdrawal-queue";

let withdrawalWorker: Worker | null = null;

if (env.REDIS_ENABLED) {
  try {
    withdrawalWorker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        const { withdrawalId, toAddress, netAmountUsdt, grossAmountUsdt } = job.data;
        logger.info(`[BullMQ Worker] Processing withdrawal job. JobID: ${job.id}, WithdrawalID: ${withdrawalId}`);

        // Fetch transaction
        const tx = await TransactionModel.findById(withdrawalId);
        if (!tx) {
          logger.error(`[BullMQ Worker] Withdrawal transaction not found in database: ${withdrawalId}`);
          return;
        }

        if (tx.status !== "pending") {
          logger.warn(`[BullMQ Worker] Withdrawal transaction already processed: status is ${tx.status}. Skipping.`);
          return;
        }

        // Execute BSC transfer
        const txHash = await blockchainService.sendBscUsdt(toAddress, netAmountUsdt);
        if (!txHash) {
          throw new Error("On-chain transfer failed or returned empty transaction hash.");
        }

        // Settle balances in MongoDB
        await walletRepository.completeWithdrawalAmount(tx.userId.toString(), grossAmountUsdt);
        await walletRepository.debitAdminWithdrawal(netAmountUsdt);

        // Update transaction status
        tx.status = "completed";
        tx.txnHash = txHash;
        tx.reviewedAt = new Date();
        tx.notes = `${tx.notes || ""} [Auto-approved via queue. TxHash: ${txHash}]`.trim();
        await tx.save();

        logger.info(`[BullMQ Worker] Withdrawal job completed successfully. JobID: ${job.id}`);
      },
      {
        connection: getBullMqConnectionOptions(),
        concurrency: 1, // Concurrency 1 prevents nonce collisions on-chain
      },
    );

    // Handle job failures
    withdrawalWorker.on("failed", async (job, err) => {
      if (!job) return;
      const { withdrawalId } = job.data;
      logger.error(`[BullMQ Worker] Job ${job.id} failed: ${err.message}`);

      // Revert to manual pending review queue if attempts are exhausted
      if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
        logger.warn(`[BullMQ Worker] Max retries exhausted for withdrawal ${withdrawalId}. Reverting to manual queue.`);
        try {
          const tx = await TransactionModel.findById(withdrawalId);
          if (tx && tx.status === "pending") {
            tx.notes = `${tx.notes || ""} [Auto-withdrawal failed: ${err.message}]`.trim();
            await tx.save();
          }
        } catch (dbErr) {
          logger.error(`[BullMQ Worker] Failed to append failure notes to transaction: ${dbErr}`);
        }
      }
    });

    logger.info(`[BullMQ Worker] Worker initialized successfully.`);
  } catch (err) {
    logger.error(`[BullMQ Worker] Failed to initialize worker: ${err}`);
  }
}

export { withdrawalWorker };
