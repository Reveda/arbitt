import { Types } from "mongoose";
import { logger } from "../../../config/logger";
import { blockchainService } from "./blockchain.service";
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
type ListDepositRequestsInput = z.infer<typeof listDepositRequestsQuerySchema>;

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
  private async getSummaryBalanceFields(userId: string, wallet: any) {
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
      "Wallet top-ups must be paid on-chain and verified by Moralis.",
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
  ): Promise<CreateWithdrawalResponseDto> {
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
    const isMatched = await comparePassword(input.transactionPassword, user.transactionPasswordHash);
    if (!isMatched) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Incorrect transaction password.");
    }

    const grossAmountUsdt = roundUsdt(input.amountUsdt);
    const chargeUsdt = roundUsdt((grossAmountUsdt * WITHDRAWAL_CHARGE_PERCENT) / 100);
    const netAmountUsdt = roundUsdt(grossAmountUsdt - chargeUsdt);

    await walletRepository.ensureWallet(userId);
    const wallet = await walletRepository.lockWithdrawalAmount(userId, grossAmountUsdt);

    if (!wallet) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Insufficient wallet balance for this withdrawal request.",
      );
    }

    try {
      let status = "pending";
      let txnHash: string | undefined = undefined;
      let reviewedAt: Date | undefined = undefined;

      // Automatically process on-chain withdrawals up to 200 USDT
      if (grossAmountUsdt <= 200) {
        logger.info(
          `[Auto-Withdrawal] Attempting automatic on-chain transfer for user: ${userId}, gross amount: ${grossAmountUsdt} USDT (net: ${netAmountUsdt} USDT)`,
        );
        const autoTxHash = await blockchainService.sendBscUsdt(input.walletAddress, netAmountUsdt);
        if (autoTxHash) {
          logger.info(`[Auto-Withdrawal] Automatic withdrawal succeeded. TxHash: ${autoTxHash}`);
          status = "completed";
          txnHash = autoTxHash;
          reviewedAt = new Date();

          // Settle the balances
          await walletRepository.completeWithdrawalAmount(userId, grossAmountUsdt);
          await walletRepository.debitAdminWithdrawal(netAmountUsdt);
        } else {
          logger.warn(
            `[Auto-Withdrawal] Automatic on-chain transfer failed/skipped for user: ${userId}. Sending to manual approval queue.`,
          );
        }
      }

      const transaction = await TransactionModel.create({
        amountUsdt: netAmountUsdt,
        network: input.network,
        walletAddress: input.walletAddress,
        notes: [
          status === "completed"
            ? `Auto-approved withdrawal: gross ${grossAmountUsdt} USDT, 10% charge ${chargeUsdt} USDT, net payout ${netAmountUsdt} USDT.`
            : `Withdrawal request: gross ${grossAmountUsdt} USDT, 10% charge ${chargeUsdt} USDT, net payout ${netAmountUsdt} USDT.`,
          input.notes,
        ]
          .filter(Boolean)
          .join(" "),
        payoutPercent: WITHDRAWAL_CHARGE_PERCENT,
        payoutPrincipalUsdt: grossAmountUsdt,
        status,
        txnHash,
        reviewedAt,
        type: "withdrawal",
        userId,
      });

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
      await walletRepository.unlockWithdrawalAmount(userId, grossAmountUsdt);
      throw caughtError;
    }
  }
}

export const walletService = new WalletService();
