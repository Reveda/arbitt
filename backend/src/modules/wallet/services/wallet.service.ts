import mongoose, { Types } from "mongoose";
import { logger } from "../../../config/logger";
import { env } from "../../../config/env";
import { blockchainService } from "./blockchain.service";
import { addWithdrawalJob } from "../queues/withdrawal.queue";
import { HTTP_STATUS } from "../../../constants/http";
import { ApiError } from "../../../utils/ApiError";
import { comparePassword } from "../../../utils/password";
import { userRepository } from "../../users/repositories/user.repository";
import { buildPaginationDto } from "../../../utils/ApiResponse";
import { buildDateRangeFilter } from "../../../utils/dateRange";
import type { z } from "zod";
import { getPlatformPaymentWallet } from "../../admin/services/payment-wallet.service";
import { TransactionModel } from "../../transactions/models/transaction.model";
import { toTransactionNode } from "../../transactions/dtos/transaction.dto";
import type {
  CreateDepositResponseDto,
  CreateWithdrawalResponseDto,
  ListDepositsResponseDto,
  WalletSummaryResponseDto,
} from "../dtos/wallet.dto";
import { walletRepository } from "../repositories/wallet.repository";
import { UserPlanPurchaseModel } from "../../plans/models/user-plan-purchase.model";
import type {
  createDepositRequestSchema,
  createWithdrawalRequestSchema,
  listDepositRequestsQuerySchema,
} from "../validations/wallet.validation";

type CreateDepositRequestInput = z.infer<typeof createDepositRequestSchema>;
type CreateWithdrawalRequestInput = z.infer<typeof createWithdrawalRequestSchema>;

const USDT_DECIMALS = 18;
const USDT_SCALE = 10n ** BigInt(USDT_DECIMALS);

function decimalToTokenUnits(value: string | number) {
  const normalized = String(value).trim();
  const [whole, fraction = ""] = normalized.split(".");
  return (
    BigInt(whole) * USDT_SCALE +
    BigInt((fraction + "0".repeat(USDT_DECIMALS)).slice(0, USDT_DECIMALS))
  );
}

function tokenUnitsToNumber(value: bigint) {
  return Number(value) / Number(USDT_SCALE);
}
type ListDepositRequestsInput = z.infer<typeof listDepositRequestsQuerySchema>;
type WalletBalanceRecord = {
  availableUsdt?: number;
  lifetimeDepositsUsdt?: number;
  lifetimeRewardsUsdt?: number;
  lifetimeWithdrawalsUsdt?: number;
};

const WITHDRAWAL_CHARGE_PERCENT = 10;

function roundUsdt(value: number) {
  return Math.round(value * 100) / 100;
}

export async function calculateTopUpBalance(
  userId: string,
  rawWalletAvailable: number,
  rawWalletLifetimeDeposits: number,
): Promise<number> {
  const activePlans = await UserPlanPurchaseModel.find({ userId, status: "active" }).lean();
  const activePlanSum = activePlans.reduce((sum, plan) => sum + (plan.amountUsdt ?? 0), 0);
  return Math.min(rawWalletAvailable, Math.max(0, rawWalletLifetimeDeposits - activePlanSum));
}
export class WalletService {
  private async getSummaryBalanceFields(userId: string, wallet: WalletBalanceRecord | null) {
    const [pendingWithdrawals, activePlans] = await Promise.all([
      TransactionModel.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(userId),
            type: "withdrawal",
            status: "pending",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$payoutPrincipalUsdt" },
          },
        },
      ]),
      UserPlanPurchaseModel.find({ userId, status: "active" }).lean(),
    ]);

    const activePlanSum = activePlans.reduce((sum, plan) => sum + (plan.amountUsdt ?? 0), 0);
    const rawWalletAvailable = wallet?.availableUsdt ?? 0;
    const rawWalletLifetimeDeposits = wallet?.lifetimeDepositsUsdt ?? 0;
    const topUpBalance = Math.min(
      rawWalletAvailable,
      Math.max(0, rawWalletLifetimeDeposits - activePlanSum),
    );

    const lockedUsdt = pendingWithdrawals[0]?.total ?? 0;

    return {
      availableUsdt: rawWalletAvailable,
      topUpBalance,
      lockedUsdt,
      lockedPlanUsdt: activePlanSum,
      lifetimeDepositsUsdt: rawWalletLifetimeDeposits,
      lifetimeWithdrawalsUsdt: wallet?.lifetimeWithdrawalsUsdt ?? 0,
      lifetimeRewardsUsdt: wallet?.lifetimeRewardsUsdt ?? 0,
    };
  }

  async getWalletSummary(userId: string): Promise<WalletSummaryResponseDto> {
    const [wallet, platformDepositWallet] = await Promise.all([
      walletRepository.findByUserId(userId),
      getPlatformPaymentWallet(),
    ]);

    const balanceFields = await this.getSummaryBalanceFields(userId, wallet);

    return {
      ...balanceFields,
      platformDepositWallet,
    };
  }

  async createDepositRequest(
    userId: string,
    input: CreateDepositRequestInput,
  ): Promise<CreateDepositResponseDto> {
    void userId;
    void input;

    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Wallet top-ups must be paid on-chain and verified by transaction hash.",
    );
  }

  async listDepositRequests(
    userId: string,
    input: ListDepositRequestsInput,
  ): Promise<ListDepositsResponseDto> {
    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;
    const filter = {
      userId,
      type: "deposit",
      ...(input.status ? { status: input.status } : {}),
    };
    const dateRange = buildDateRangeFilter({ fromDate: input.fromDate, toDate: input.toDate });

    if (dateRange) {
      Object.assign(filter, { createdAt: dateRange });
    }
    const [transactions, total] = await Promise.all([
      TransactionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      TransactionModel.countDocuments(filter),
    ]);

    return {
      deposits: transactions.map((transaction) => toTransactionNode(transaction)),
      pagination: buildPaginationDto({
        page,
        limit,
        total,
      }),
    };
  }

  async createWithdrawalRequest(
    userId: string,
    input: CreateWithdrawalRequestInput,
    idempotencyKey?: string,
  ): Promise<CreateWithdrawalResponseDto> {
    const existing = idempotencyKey
      ? await TransactionModel.findOne({ userId, type: "withdrawal", idempotencyKey }).lean()
      : null;
    if (existing) {
      const existingGross = existing.payoutPrincipalUsdt ?? existing.amountUsdt;
      const existingCharge = roundUsdt(existingGross - (existing.amountUsdt ?? 0));
      const existingWallet = await walletRepository.findByUserId(userId);
      return {
        ...toTransactionNode(existing),
        chargeUsdt: existingCharge,
        grossAmountUsdt: existingGross,
        netAmountUsdt: existing.amountUsdt,
        wallet: await this.getSummaryBalanceFields(userId, existingWallet),
        withdrawalChargePercent: WITHDRAWAL_CHARGE_PERCENT,
      };
    }
    // Verify transaction password first
    const user = await userRepository.findByIdWithTransactionPassword(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }
    if (!user.transactionPasswordHash) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Transaction password is not set. Please set it in your profile first.",
      );
    }
    const isMatched = await comparePassword(
      input.transactionPassword,
      user.transactionPasswordHash,
    );
    if (!isMatched) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Incorrect transaction password.");
    }

    const grossAmountTokenUnits = decimalToTokenUnits(input.amountUsdt);
    const chargeTokenUnits = (grossAmountTokenUnits * BigInt(WITHDRAWAL_CHARGE_PERCENT)) / 100n;
    const netAmountTokenUnits = grossAmountTokenUnits - chargeTokenUnits;
    const grossAmountUsdt = tokenUnitsToNumber(grossAmountTokenUnits);
    const chargeUsdt = tokenUnitsToNumber(chargeTokenUnits);
    const netAmountUsdt = tokenUnitsToNumber(netAmountTokenUnits);

    await walletRepository.ensureWallet(userId);
    const wallet = await walletRepository.lockWithdrawalAmount(userId, grossAmountUsdt);

    if (!wallet) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Insufficient wallet balance for this withdrawal request.",
      );
    }

    let transactionId: string | undefined;
    let broadcastAttempted = false;

    try {
      let status = "pending";
      let txnHash: string | undefined = undefined;
      let reviewedAt: Date | undefined = undefined;
      let initialNotes = `Withdrawal request: gross ${grossAmountUsdt} USDT, 10% charge ${chargeUsdt} USDT, net payout ${netAmountUsdt} USDT.`;

      const isQueueEnabled = env.REDIS_ENABLED;

      // Automatically process on-chain withdrawals up to 200 USDT
      if (grossAmountUsdt <= 200) {
        if (isQueueEnabled) {
          initialNotes += ` [Queued for background processing]`;
        } else {
          const processingTransaction = await TransactionModel.create({
            amountUsdt: netAmountUsdt,
            network: input.network,
            walletAddress: input.walletAddress,
            notes: [initialNotes, input.notes].filter(Boolean).join(" "),
            payoutPercent: WITHDRAWAL_CHARGE_PERCENT,
            payoutPrincipalUsdt: grossAmountUsdt,
            grossAmountTokenUnits: grossAmountTokenUnits.toString(),
            netAmountTokenUnits: netAmountTokenUnits.toString(),
            status: "processing",
            type: "withdrawal",
            userId,
            ...(idempotencyKey ? { idempotencyKey } : {}),
          });
          transactionId = processingTransaction._id.toString();
          broadcastAttempted = true;

          logger.info(
            `[Auto-Withdrawal] Queue disabled. Attempting synchronous transfer for user: ${userId}, gross amount: ${grossAmountUsdt} USDT (net: ${netAmountUsdt} USDT)`,
          );
          const autoTxHash = await blockchainService.sendBscUsdt(
            input.walletAddress,
            netAmountUsdt,
          );
          if (autoTxHash) {
            logger.info(
              `[Auto-Withdrawal] Synchronous withdrawal succeeded. TxHash: ${autoTxHash}`,
            );
            const completedAt = new Date();
            await mongoose.connection.transaction(async (session) => {
              const settledWallet = await walletRepository.completeWithdrawalAmount(
                userId,
                grossAmountUsdt,
                session,
              );
              if (!settledWallet) {
                throw new Error("Unable to settle the locked withdrawal amount.");
              }

              const adminWallet = await walletRepository.debitAdminWithdrawal(
                netAmountUsdt,
                session,
              );
              if (!adminWallet) {
                throw new Error("Unable to debit the platform withdrawal reserve.");
              }

              const completedTransaction = await TransactionModel.findOneAndUpdate(
                { _id: transactionId, status: "processing" },
                {
                  $set: {
                    status: "completed",
                    txnHash: autoTxHash,
                    reviewedAt: completedAt,
                    notes: `Auto-approved withdrawal: gross ${grossAmountUsdt} USDT, 10% charge ${chargeUsdt} USDT, net payout ${netAmountUsdt} USDT.`,
                  },
                },
                { new: true, session },
              );
              if (!completedTransaction) {
                throw new Error("Unable to mark the withdrawal completed.");
              }
            });

            status = "completed";
            txnHash = autoTxHash;
            reviewedAt = completedAt;
          } else {
            logger.warn(
              `[Auto-Withdrawal] Synchronous transfer did not confirm for user: ${userId}. Keeping funds locked for manual reconciliation.`,
            );
            initialNotes +=
              " [Automatic transfer did not confirm; manual reconciliation required.]";
            await TransactionModel.updateOne(
              { _id: transactionId },
              { $set: { notes: initialNotes, status: "pending" } },
            );
            // The transfer service only returns a hash after confirmation. A
            // null result is treated as a failed automatic attempt and kept
            // in the normal manual-review queue; errors after a confirmed
            // broadcast are handled by the catch path and remain processing.
            status = "pending";
          }
        }
      }

      if (!transactionId) {
        const transaction = await TransactionModel.create({
          amountUsdt: netAmountUsdt,
          network: input.network,
          walletAddress: input.walletAddress,
          notes: [initialNotes, input.notes].filter(Boolean).join(" "),
          payoutPercent: WITHDRAWAL_CHARGE_PERCENT,
          payoutPrincipalUsdt: grossAmountUsdt,
          grossAmountTokenUnits: grossAmountTokenUnits.toString(),
          netAmountTokenUnits: netAmountTokenUnits.toString(),
          status,
          txnHash,
          reviewedAt,
          type: "withdrawal",
          userId,
          ...(idempotencyKey ? { idempotencyKey } : {}),
        });
        transactionId = transaction._id.toString();
      }

      const transaction = await TransactionModel.findById(transactionId).lean();
      if (!transaction) {
        throw new Error("Withdrawal transaction could not be loaded after creation.");
      }

      // Queue the background job if eligible and queue is enabled
      if (grossAmountUsdt <= 200 && isQueueEnabled) {
        await addWithdrawalJob(transactionId, input.walletAddress, netAmountUsdt, grossAmountUsdt);
      }

      // Get latest wallet state after potential automatic settlements
      const latestWallet = await walletRepository.findByUserId(userId);

      return {
        ...toTransactionNode(transaction),
        chargeUsdt,
        grossAmountUsdt,
        netAmountUsdt,
        wallet: await this.getSummaryBalanceFields(userId, latestWallet || wallet),
        withdrawalChargePercent: WITHDRAWAL_CHARGE_PERCENT,
      };
    } catch (caughtError) {
      if (!broadcastAttempted) {
        await walletRepository.unlockWithdrawalAmount(userId, grossAmountUsdt);
      } else if (transactionId) {
        await TransactionModel.updateOne(
          { _id: transactionId, status: "processing" },
          {
            $set: {
              notes: `[Automatic withdrawal requires manual reconciliation: ${caughtError instanceof Error ? caughtError.message : "unknown error"}]`,
            },
          },
        );
      }
      throw caughtError;
    }
  }
}

export const walletService = new WalletService();
