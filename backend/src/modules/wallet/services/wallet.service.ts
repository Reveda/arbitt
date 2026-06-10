import { HTTP_STATUS } from "../../../constants/http";
import { ApiError } from "../../../utils/ApiError";
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

export class WalletService {
  async getWalletSummary(userId: string): Promise<WalletSummaryResponseDto> {
    const [wallet, platformDepositWallet] = await Promise.all([
      walletRepository.findByUserId(userId),
      getPlatformPaymentWallet(),
    ]);

    return {
      availableUsdt: wallet?.availableUsdt ?? 0,
      lockedUsdt: wallet?.lockedUsdt ?? 0,
      lifetimeDepositsUsdt: wallet?.lifetimeDepositsUsdt ?? 0,
      lifetimeWithdrawalsUsdt: wallet?.lifetimeWithdrawalsUsdt ?? 0,
      lifetimeRewardsUsdt: wallet?.lifetimeRewardsUsdt ?? 0,
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
      const transaction = await TransactionModel.create({
        amountUsdt: netAmountUsdt,
        network: input.network,
        notes: [
          `Withdrawal request: gross ${grossAmountUsdt} USDT, 10% charge ${chargeUsdt} USDT, net payout ${netAmountUsdt} USDT.`,
          input.notes,
        ]
          .filter(Boolean)
          .join(" "),
        payoutPercent: WITHDRAWAL_CHARGE_PERCENT,
        payoutPrincipalUsdt: grossAmountUsdt,
        status: "pending",
        type: "withdrawal",
        userId,
      });

      return {
        ...toTransactionNode(transaction),
        chargeUsdt,
        grossAmountUsdt,
        netAmountUsdt,
        wallet: {
          availableUsdt: wallet.availableUsdt ?? 0,
          lockedUsdt: wallet.lockedUsdt ?? 0,
          lifetimeDepositsUsdt: wallet.lifetimeDepositsUsdt ?? 0,
          lifetimeRewardsUsdt: wallet.lifetimeRewardsUsdt ?? 0,
          lifetimeWithdrawalsUsdt: wallet.lifetimeWithdrawalsUsdt ?? 0,
        },
        withdrawalChargePercent: WITHDRAWAL_CHARGE_PERCENT,
      };
    } catch (caughtError) {
      await walletRepository.unlockWithdrawalAmount(userId, grossAmountUsdt);
      throw caughtError;
    }
  }
}

export const walletService = new WalletService();
