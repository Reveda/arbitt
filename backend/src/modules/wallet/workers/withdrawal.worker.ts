import { Worker, type Job } from "bullmq";
import { getBullMqConnectionOptions } from "../../../config/redis";
import { logger } from "../../../config/logger";
import { TransactionModel } from "../../transactions/models/transaction.model";
import { blockchainService } from "../services/blockchain.service";
import { walletRepository } from "../repositories/wallet.repository";
import { env } from "../../../config/env";
import mongoose from "mongoose";

const QUEUE_NAME = "withdrawal-queue";

export type WithdrawalJobData = {
  withdrawalId: string;
  toAddress: string;
  netAmountUsdt: number;
  grossAmountUsdt: number;
};

export async function processWithdrawalJob(data: WithdrawalJobData) {
  const { withdrawalId, toAddress, netAmountUsdt, grossAmountUsdt } = data;

  // Claim the withdrawal before broadcasting. This is intentionally a
  // conditional update so duplicate/retried jobs cannot send twice.
  const tx = await TransactionModel.findOneAndUpdate(
    { _id: withdrawalId, type: "withdrawal", status: "pending" },
    {
      $set: { status: "processing", reviewedAt: new Date() },
    },
    { new: true },
  );
  if (!tx) {
    return;
  }

  const txHash = await blockchainService.sendBscUsdt(toAddress, netAmountUsdt);
  if (!txHash) {
    throw new Error("On-chain transfer failed or returned empty transaction hash.");
  }

  await mongoose.connection.transaction(async (session) => {
    const settledWallet = await walletRepository.completeWithdrawalAmount(
      tx.userId.toString(),
      grossAmountUsdt,
      session,
    );
    if (!settledWallet) {
      throw new Error("Unable to settle the locked withdrawal amount.");
    }

    const adminWallet = await walletRepository.debitAdminWithdrawal(netAmountUsdt, session);
    if (!adminWallet) {
      throw new Error("Unable to debit the platform withdrawal reserve.");
    }

    const completed = await TransactionModel.findOneAndUpdate(
      { _id: withdrawalId, status: "processing" },
      {
        $set: {
          status: "completed",
          txnHash: txHash,
          reviewedAt: new Date(),
          notes: `${tx.notes || ""} [Auto-approved via queue. TxHash: ${txHash}]`.trim(),
        },
      },
      { new: true, session },
    );
    if (!completed) {
      throw new Error("Unable to mark the withdrawal completed.");
    }
  });
}

export function createWithdrawalWorker(): Worker | null {
  if (!env.REDIS_ENABLED) {
    logger.info("[BullMQ Worker] Redis disabled. Withdrawal worker not started.");
    return null;
  }

  try {
    const withdrawalWorker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        const { withdrawalId, toAddress, netAmountUsdt, grossAmountUsdt } = job.data;
        logger.info(
          `[BullMQ Worker] Processing withdrawal job. JobID: ${job.id}, WithdrawalID: ${withdrawalId}`,
        );
        await processWithdrawalJob({ withdrawalId, toAddress, netAmountUsdt, grossAmountUsdt });
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

      // A processing withdrawal may already have been broadcast. Do not
      // revert it to pending, because that could cause a second payout.
      if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
        logger.warn(
          `[BullMQ Worker] Max retries exhausted for withdrawal ${withdrawalId}. Manual reconciliation required; no automatic retry will be allowed.`,
        );
        try {
          const tx = await TransactionModel.findById(withdrawalId);
          if (tx && tx.status === "processing") {
            tx.notes = `${tx.notes || ""} [Auto-withdrawal failed: ${err.message}]`.trim();
            await tx.save();
          }
        } catch (dbErr) {
          logger.error(`[BullMQ Worker] Failed to append failure notes to transaction: ${dbErr}`);
        }
      }
    });

    logger.info(`[BullMQ Worker] Worker initialized successfully.`);
    return withdrawalWorker;
  } catch (err) {
    logger.error(`[BullMQ Worker] Failed to initialize worker: ${err}`);
    return null;
  }
}
