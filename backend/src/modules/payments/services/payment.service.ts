import { HTTP_STATUS } from "../../../constants/http";
import mongoose from "mongoose";
import { env } from "../../../config/env";
import { ApiError } from "../../../utils/ApiError";
import { planRepository } from "../../plans/repositories/plan.repository";
import { UserPlanPurchaseModel } from "../../plans/models/user-plan-purchase.model";
import { rewardService } from "../../rewards/services/reward.service";
import { toTransactionNode } from "../../transactions/dtos/transaction.dto";
import { TransactionModel } from "../../transactions/models/transaction.model";
import { getPlatformPaymentWalletForNetwork } from "../../admin/services/payment-wallet.service";
import { adminService } from "../../admin/services/admin.service";
import { walletRepository } from "../../wallet/repositories/wallet.repository";
import {
  isEvmAddress,
  normalizeEvmAddress,
  PAYMENT_NETWORK_CONFIGS,
  type PaymentNetwork,
} from "../constants/payment-networks";
import { PaymentIntentModel, type PaymentIntentDocument } from "../models/payment-intent.model";
import {
  toPaymentIntentDto,
  type CreateDepositPaymentIntentResponseDto,
  type CreatePlanPaymentIntentResponseDto,
  type GetPaymentIntentResponseDto,
  type SubmitPaymentIntentTxHashResponseDto,
} from "../dtos/payment.dto";
import type {
  createDepositPaymentIntentSchema,
  createPlanPaymentIntentSchema,
} from "../validations/payment.validation";
import type { z } from "zod";

type CreatePlanPaymentIntentInput = z.infer<typeof createPlanPaymentIntentSchema>;
type CreateDepositPaymentIntentInput = z.infer<typeof createDepositPaymentIntentSchema>;

type PaymentIntentRecord = PaymentIntentDocument & {
  _id?: unknown;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type PaymentCompletionResult = "completed" | "duplicate";
type RpcResponse = {
  error?: unknown;
  result?: unknown;
};
type EvmLog = {
  address?: string;
  data?: string;
  logIndex?: unknown;
  topics?: unknown;
};
type EvmReceipt = {
  logs?: unknown;
  status?: unknown;
  blockNumber?: unknown;
};

const PLAN_PAYMENT_INTENT_TYPE = "plan_purchase";
const WALLET_DEPOSIT_INTENT_TYPE = "wallet_deposit";
const MATCHABLE_INTENT_STATUSES = ["pending", "detected", "ambiguous"] as const;

function roundUsdt(value: number) {
  return Math.round(value * 100) / 100;
}

function pow10(decimals: number) {
  return BigInt(10) ** BigInt(decimals);
}

function decimalToTokenUnits(value: string | number, decimals: number) {
  const normalized = String(value).trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid USDT amount.");
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const paddedFraction = `${fractionPart}${"0".repeat(decimals)}`.slice(0, decimals);
  const wholeUnits = BigInt(wholePart || "0") * pow10(decimals);
  const fractionUnits = BigInt(paddedFraction || "0");

  return (wholeUnits + fractionUnits).toString();
}

function normalizeHash(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

async function getActiveTier(tierKey: string, amountUsdt: number) {
  const ruleSet = await planRepository.ensureDefaultRuleSet();
  const tier = [...ruleSet.investmentTiers].find(
    (candidate) => candidate.isActive !== false && candidate.tier === tierKey.trim(),
  );

  if (!tier) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Selected plan is not active.");
  }

  if (amountUsdt < tier.minUsdt || amountUsdt > tier.maxUsdt) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `${tier.name} purchase amount must be between ${tier.minUsdt} and ${tier.maxUsdt} USDT.`,
    );
  }

  return tier;
}

async function expireOldIntent(intent: PaymentIntentRecord) {
  if (
    !MATCHABLE_INTENT_STATUSES.includes(intent.status as (typeof MATCHABLE_INTENT_STATUSES)[number])
  ) {
    return false;
  }

  if (new Date(intent.expiresAt).getTime() >= Date.now()) {
    return false;
  }

  await PaymentIntentModel.updateOne(
    { _id: intent._id },
    {
      $set: {
        failureReason: "Payment window expired before confirmation.",
        status: "expired",
      },
    },
  );

  return true;
}

const NETWORK_RPC_ENDPOINTS: Record<PaymentNetwork, string[]> = {
  BEP20: [env.BSC_PRIMARY_RPC_URL, env.BSC_BACKUP_RPC_URL],
};

async function fetchRpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed with status: ${response.status}`);
  }

  const json = (await response.json()) as RpcResponse;
  if (json.error) {
    throw new Error(`RPC returned error: ${JSON.stringify(json.error)}`);
  }

  return json.result;
}

async function callRpcWithFallback(
  network: PaymentNetwork,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const endpoints = NETWORK_RPC_ENDPOINTS[network];
  let lastError: unknown = null;

  for (const url of endpoints) {
    try {
      return await fetchRpc(url, method, params);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`All RPC endpoints for network ${network} failed.`);
}

type VerificationResult =
  | { status: "verified"; senderAddress: string; logIndex: string }
  | { status: "failed"; reason: string }
  | { status: "pending_node"; reason: string };

async function verifyUSDTTransfer(input: {
  network: PaymentNetwork;
  txnHash: string;
  expectedReceiver: string;
  expectedContract: string;
  expectedAmountUnits: string;
}): Promise<VerificationResult> {
  try {
    const receipt = (await callRpcWithFallback(input.network, "eth_getTransactionReceipt", [
      input.txnHash,
    ])) as EvmReceipt | null;

    if (!receipt) {
      return {
        status: "pending_node",
        reason: "Transaction receipt not found on-chain.",
      };
    }

    const status = receipt.status;
    const isSuccess = status === "0x1" || status === 1 || status === "1" || status === true;

    if (!isSuccess) {
      return {
        status: "failed",
        reason: `Transaction reverted on-chain with status: ${status}`,
      };
    }

    const receiptBlockNumber = parseRpcQuantity(receipt.blockNumber);
    if (receiptBlockNumber === null) {
      return { status: "pending_node", reason: "Receipt block number is unavailable." };
    }

    const latestBlock = parseRpcQuantity(
      await callRpcWithFallback(input.network, "eth_blockNumber", []),
    );
    if (
      latestBlock === null ||
      latestBlock < receiptBlockNumber + BigInt(env.BSC_REQUIRED_CONFIRMATIONS - 1)
    ) {
      return {
        status: "pending_node",
        reason: `Waiting for ${env.BSC_REQUIRED_CONFIRMATIONS} BSC confirmations.`,
      };
    }

    const logs = Array.isArray(receipt.logs) ? receipt.logs : [];
    const expectedContractNormalized = input.expectedContract.toLowerCase();
    const expectedReceiverNormalized = input.expectedReceiver.toLowerCase();
    const expectedAmountUnits = input.expectedAmountUnits;
    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    for (const rawLog of logs) {
      const log = rawLog as EvmLog;
      if (log.address?.toLowerCase() !== expectedContractNormalized) {
        continue;
      }

      const topics = Array.isArray(log.topics)
        ? log.topics.filter((topic): topic is string => typeof topic === "string")
        : [];
      if (topics[0]?.toLowerCase() !== transferTopic) {
        continue;
      }

      if (topics.length < 3) {
        continue;
      }

      const logReceiver = "0x" + topics[2].slice(-40).toLowerCase();
      if (logReceiver !== expectedReceiverNormalized) {
        continue;
      }

      let logValue: string;
      try {
        const dataHex = log.data || "0x";
        logValue = BigInt(dataHex.startsWith("0x") ? dataHex : `0x${dataHex}`).toString();
      } catch {
        continue;
      }

      if (logValue !== expectedAmountUnits) {
        continue;
      }

      const senderAddress = "0x" + topics[1].slice(-40).toLowerCase();

      let logIndexDecimal = "0";
      if (log.logIndex !== undefined && log.logIndex !== null) {
        const indexStr = String(log.logIndex);
        if (indexStr.startsWith("0x") || indexStr.startsWith("0X")) {
          try {
            logIndexDecimal = BigInt(indexStr).toString();
          } catch {
            logIndexDecimal = indexStr;
          }
        } else {
          logIndexDecimal = indexStr;
        }
      }

      return {
        status: "verified",
        senderAddress,
        logIndex: logIndexDecimal,
      };
    }

    return {
      status: "failed",
      reason: "No matching USDT transfer found in transaction logs.",
    };
  } catch (error) {
    return {
      status: "pending_node",
      reason: `RPC node error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

function parseRpcQuantity(value: unknown): bigint | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^(0x[0-9a-f]+|\d+)$/i.test(value)) {
    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }
  return null;
}

export class PaymentService {
  async createDepositPaymentIntent(
    userId: string,
    input: CreateDepositPaymentIntentInput,
    idempotencyKey: string,
  ): Promise<CreateDepositPaymentIntentResponseDto> {
    const existingIntent = await PaymentIntentModel.findOne({ userId, idempotencyKey });
    if (existingIntent) return { intent: toPaymentIntentDto(existingIntent) };
    const amountUsdtText = input.amountUsdt;
    const amountUsdt = Number(amountUsdtText);
    const networkConfig = PAYMENT_NETWORK_CONFIGS[input.network];
    const platformWallet = await getPlatformPaymentWalletForNetwork(input.network);

    if (!platformWallet.configured || !isEvmAddress(platformWallet.address)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `${input.network} admin USDT wallet is not configured yet.`,
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.PAYMENT_INTENT_EXPIRES_MINUTES * 60 * 1000);
    const intent = await PaymentIntentModel.create({
      amountTokenUnits: decimalToTokenUnits(amountUsdtText, networkConfig.tokenDecimals),
      amountUsdt,
      idempotencyKey,
      chainId: networkConfig.chainId,
      chainName: networkConfig.chainName,
      expiresAt,
      gasToken: networkConfig.gasToken,
      network: networkConfig.network,
      planName: "Wallet Top-up",
      receiverAddress: platformWallet.address,
      receiverAddressNormalized: normalizeEvmAddress(platformWallet.address),
      status: "pending",
      tier: "WALLET_TOPUP",
      tokenContract: normalizeEvmAddress(networkConfig.tokenContract),
      tokenDecimals: networkConfig.tokenDecimals,
      tokenSymbol: networkConfig.tokenSymbol,
      type: WALLET_DEPOSIT_INTENT_TYPE,
      userId,
      weeklyReturnPercent: 0,
    });

    return { intent: toPaymentIntentDto(intent) };
  }

  async createPlanPaymentIntent(
    userId: string,
    input: CreatePlanPaymentIntentInput,
    idempotencyKey: string,
  ): Promise<CreatePlanPaymentIntentResponseDto> {
    const existingIntent = await PaymentIntentModel.findOne({ userId, idempotencyKey });
    if (existingIntent) return { intent: toPaymentIntentDto(existingIntent) };
    const amountUsdtText = input.amountUsdt;
    const amountUsdt = Number(amountUsdtText);
    const tier = await getActiveTier(input.tier, amountUsdt);
    const networkConfig = PAYMENT_NETWORK_CONFIGS[input.network];
    const platformWallet = await getPlatformPaymentWalletForNetwork(input.network);

    if (!platformWallet.configured || !isEvmAddress(platformWallet.address)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `${input.network} admin USDT wallet is not configured yet.`,
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.PAYMENT_INTENT_EXPIRES_MINUTES * 60 * 1000);
    const intent = await PaymentIntentModel.create({
      amountTokenUnits: decimalToTokenUnits(amountUsdtText, networkConfig.tokenDecimals),
      amountUsdt,
      idempotencyKey,
      chainId: networkConfig.chainId,
      chainName: networkConfig.chainName,
      expiresAt,
      gasToken: networkConfig.gasToken,
      network: networkConfig.network,
      planName: tier.name,
      receiverAddress: platformWallet.address,
      receiverAddressNormalized: normalizeEvmAddress(platformWallet.address),
      status: "pending",
      tier: tier.tier,
      tokenContract: normalizeEvmAddress(networkConfig.tokenContract),
      tokenDecimals: networkConfig.tokenDecimals,
      tokenSymbol: networkConfig.tokenSymbol,
      type: PLAN_PAYMENT_INTENT_TYPE,
      userId,
      weeklyReturnPercent: tier.weeklyReturnMaxPercent,
    });

    return { intent: toPaymentIntentDto(intent) };
  }

  async getPaymentIntent(userId: string, intentId: string): Promise<GetPaymentIntentResponseDto> {
    const intent = (await PaymentIntentModel.findOne({
      _id: intentId,
      userId,
    }).lean()) as PaymentIntentRecord | null;

    if (!intent) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment intent not found.");
    }

    await expireOldIntent(intent);

    if (
      (intent.status === "pending" ||
        intent.status === "detected" ||
        intent.status === "ambiguous") &&
      intent.txnHash
    ) {
      const verifiedIntent = await this.verifyPaymentIntentOnChain(String(intent._id));
      return { intent: toPaymentIntentDto(verifiedIntent ?? intent) };
    }

    if (intent.status === "pending" || intent.status === "detected") {
      const refreshedIntent = await PaymentIntentModel.findById(intent._id).lean();
      return { intent: toPaymentIntentDto(refreshedIntent ?? intent) };
    }

    return { intent: toPaymentIntentDto(intent) };
  }

  async verifyPaymentIntentOnChain(intentId: string): Promise<PaymentIntentRecord | null> {
    const intent = await PaymentIntentModel.findById(intentId);
    if (!intent) return null;

    if (
      !MATCHABLE_INTENT_STATUSES.includes(
        intent.status as (typeof MATCHABLE_INTENT_STATUSES)[number],
      ) ||
      !intent.txnHash
    ) {
      return intent.toObject ? intent.toObject() : intent;
    }

    const verification = await verifyUSDTTransfer({
      network: intent.network,
      txnHash: intent.txnHash,
      expectedReceiver: intent.receiverAddressNormalized,
      expectedContract: intent.tokenContract,
      expectedAmountUnits: intent.amountTokenUnits,
    });

    if (verification.status === "verified") {
      const senderAddressNormalized = normalizeEvmAddress(verification.senderAddress);
      const completeInput = {
        intent: intent.toObject ? intent.toObject() : intent,
        logIndex: verification.logIndex,
        senderAddress: verification.senderAddress,
        senderAddressNormalized,
        streamId: "rpc-verification",
        tag: "rpc-verification",
        txnHash: intent.txnHash,
        txnHashNormalized: intent.txnHashNormalized || normalizeHash(intent.txnHash),
      };

      await this.completePaymentIntent(completeInput);

      return await PaymentIntentModel.findById(intentId).lean();
    } else if (verification.status === "failed") {
      const failedIntent = await PaymentIntentModel.findByIdAndUpdate(
        intentId,
        {
          $set: {
            status: "failed",
            failureReason: verification.reason,
          },
        },
        { new: true },
      ).lean();
      return failedIntent;
    }

    return intent.toObject ? intent.toObject() : intent;
  }

  async submitPaymentIntentTxHash(input: {
    intentId: string;
    txnHash: string;
    userId: string;
  }): Promise<SubmitPaymentIntentTxHashResponseDto> {
    const txnHash = input.txnHash.trim();
    const txnHashNormalized = normalizeHash(txnHash);
    const intent = (await PaymentIntentModel.findOne({
      _id: input.intentId,
      userId: input.userId,
    }).lean()) as PaymentIntentRecord | null;

    if (!intent) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment intent not found.");
    }

    if (await expireOldIntent(intent)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This payment intent has expired.");
    }

    if (
      !MATCHABLE_INTENT_STATUSES.includes(
        intent.status as (typeof MATCHABLE_INTENT_STATUSES)[number],
      )
    ) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This payment intent cannot be updated.");
    }

    const duplicateIntent = await PaymentIntentModel.findOne({
      _id: { $ne: intent._id },
      txnHashNormalized,
    })
      .select("_id")
      .lean();

    if (duplicateIntent) {
      throw new ApiError(HTTP_STATUS.CONFLICT, "This transaction hash is already linked.");
    }

    const updatedIntent = await PaymentIntentModel.findByIdAndUpdate(
      intent._id,
      {
        $set: {
          txnHash,
          txnHashNormalized,
        },
      },
      { new: true },
    ).lean();

    if (updatedIntent) {
      this.verifyPaymentIntentOnChain(String(updatedIntent._id)).catch((err) => {
        console.error(
          `Background on-chain verification failed for intent ${updatedIntent._id}:`,
          err,
        );
      });
    }

    return { intent: toPaymentIntentDto(updatedIntent ?? intent) };
  }

  private async completePaymentIntent(input: {
    intent: PaymentIntentRecord;
    logIndex: string;
    senderAddress: string | null;
    senderAddressNormalized: string;
    streamId: string | null;
    tag: string | null;
    txnHash: string;
    txnHashNormalized: string;
  }): Promise<PaymentCompletionResult> {
    const session = env.MONGODB_TRANSACTIONS_ENABLED ? await mongoose.startSession() : undefined;
    try {
      const work = async () => {
        const existingTransaction = await TransactionModel.findOne({
          txnHash: input.txnHash,
        })
          .session(session ?? null)
          .lean();

        if (existingTransaction) {
          const expectedTransactionType =
            input.intent.type === WALLET_DEPOSIT_INTENT_TYPE ? "deposit" : "plan_purchase";
          const isSameTransaction =
            existingTransaction.type === expectedTransactionType &&
            String(existingTransaction.userId) === String(input.intent.userId) &&
            roundUsdt(existingTransaction.amountUsdt ?? 0) === roundUsdt(input.intent.amountUsdt);

          if (!isSameTransaction) {
            await PaymentIntentModel.updateOne(
              { _id: input.intent._id },
              {
                $set: {
                  failureReason: "This transaction hash is already used by another transaction.",
                  status: "failed",
                },
              },
              { session },
            );

            return "duplicate";
          }

          await PaymentIntentModel.updateOne(
            { _id: input.intent._id },
            {
              $set: {
                confirmedAt: new Date(),
                logIndex: input.logIndex,
                senderAddress: input.senderAddress,
                senderAddressNormalized: input.senderAddressNormalized,
                sourceTransactionId: existingTransaction._id,
                status: "completed",
                txnHash: input.txnHash,
                txnHashNormalized: input.txnHashNormalized,
              },
            },
            { session },
          );

          return "duplicate";
        }

        if (input.intent.type === WALLET_DEPOSIT_INTENT_TYPE) {
          const confirmedAt = new Date();
          const transaction = new TransactionModel({
            amountUsdt: input.intent.amountUsdt,
            amountTokenUnits: input.intent.amountTokenUnits,
            network: input.intent.network,
            notes: `Tx verified wallet top-up: ${input.intent.network}`,
            reviewedAt: confirmedAt,
            status: "completed",
            txnHash: input.txnHash,
            type: "deposit",
            userId: input.intent.userId,
          });
          await transaction.save({ session });
          const wallet = await walletRepository.creditDeposit(
            String(input.intent.userId),
            input.intent.amountUsdt,
            session,
          );
          if (!wallet) throw new Error("Unable to credit wallet deposit.");
          await PaymentIntentModel.updateOne(
            { _id: input.intent._id },
            {
              $set: {
                confirmedAt,
                detectedAt: input.intent.detectedAt ?? confirmedAt,
                logIndex: input.logIndex,
                senderAddress: input.senderAddress,
                senderAddressNormalized: input.senderAddressNormalized,
                sourceTransactionId: transaction._id,
                status: "completed",
                txnHash: input.txnHash,
                txnHashNormalized: input.txnHashNormalized,
                webhookMetadata: {
                  streamId: input.streamId,
                  tag: input.tag,
                  transaction: toTransactionNode(transaction),
                },
              },
            },
            { session },
          );
          return "completed";
        }

        const purchasedAt = new Date();
        const transaction = new TransactionModel({
          amountUsdt: input.intent.amountUsdt,
          amountTokenUnits: input.intent.amountTokenUnits,
          network: input.intent.network,
          notes: `Tx verified plan purchase: ${input.intent.planName}`,
          payoutPercent: input.intent.weeklyReturnPercent,
          payoutPrincipalUsdt: input.intent.amountUsdt,
          payoutTier: input.intent.tier,
          reviewedAt: purchasedAt,
          status: "completed",
          txnHash: input.txnHash,
          type: "plan_purchase",
          userId: input.intent.userId,
        });
        await transaction.save({ session });

        await Promise.all([
          UserPlanPurchaseModel.findOneAndUpdate(
          { sourceTransactionId: transaction._id },
          {
            $set: {
              amountUsdt: input.intent.amountUsdt,
              name: input.intent.planName,
              sourceTransactionId: transaction._id,
              status: "active",
              tier: input.intent.tier,
              userId: input.intent.userId,
              weeklyReturnPercent: input.intent.weeklyReturnPercent,
            },
            $setOnInsert: {
              purchasedAt,
            },
          },
          { new: true, upsert: true, session },
          ).exec(),
          walletRepository.creditAdminPlanPurchase(input.intent.amountUsdt, session),
          PaymentIntentModel.updateOne(
          { _id: input.intent._id },
          {
            $set: {
              confirmedAt: purchasedAt,
              detectedAt: input.intent.detectedAt ?? purchasedAt,
              logIndex: input.logIndex,
              senderAddress: input.senderAddress,
              senderAddressNormalized: input.senderAddressNormalized,
              sourceTransactionId: transaction._id,
              status: "completed",
              txnHash: input.txnHash,
              txnHashNormalized: input.txnHashNormalized,
              webhookMetadata: {
                streamId: input.streamId,
                tag: input.tag,
                transaction: toTransactionNode(transaction),
              },
            },
          },
            { session },
          ),
        ]);

      await rewardService.createLevelIncomeRewardsForPlanPurchase({
        amountUsdt: input.intent.amountUsdt,
        transactionId: String(transaction._id),
        userId: String(input.intent.userId),
        session,
      });
      return "completed";
      };
      const result = session ? await session.withTransaction(work) : await work();

      if (result === "completed" && input.intent.type === "plan_purchase") {
        await adminService.approveAllPendingPayouts({});
      }
      return result;
    } catch (caughtError) {
      if (
        caughtError &&
        typeof caughtError === "object" &&
        "code" in caughtError &&
        caughtError.code === 11000
      ) {
        return "duplicate";
      }

      await PaymentIntentModel.updateOne(
        { _id: input.intent._id },
        {
          $set: {
            failureReason: "Payment processing failed. Please contact support.",
            status: "failed",
          },
        },
      );

      throw caughtError;
    } finally {
      await session?.endSession();
    }
  }

  private async completeWalletDepositIntent(input: {
    intent: PaymentIntentRecord;
    logIndex: string;
    senderAddress: string | null;
    senderAddressNormalized: string;
    streamId: string | null;
    tag: string | null;
    txnHash: string;
    txnHashNormalized: string;
  }): Promise<PaymentCompletionResult> {
    const session = env.MONGODB_TRANSACTIONS_ENABLED ? await mongoose.startSession() : undefined;
    try {
      const work = async () => {
        const confirmedAt = new Date();
        const transaction = new TransactionModel({
          amountUsdt: input.intent.amountUsdt,
          network: input.intent.network,
          notes: `Tx verified wallet top-up: ${input.intent.network}`,
          reviewedAt: confirmedAt,
          status: "completed",
          txnHash: input.txnHash,
          type: "deposit",
          userId: input.intent.userId,
        });
        await transaction.save({ session });

        const wallet = await walletRepository.creditDeposit(String(input.intent.userId), input.intent.amountUsdt, session);
        if (!wallet) throw new Error("Unable to credit wallet deposit.");

        await PaymentIntentModel.updateOne(
          { _id: input.intent._id },
          {
            $set: {
              confirmedAt,
              detectedAt: input.intent.detectedAt ?? confirmedAt,
              logIndex: input.logIndex,
              senderAddress: input.senderAddress,
              senderAddressNormalized: input.senderAddressNormalized,
              sourceTransactionId: transaction._id,
              status: "completed",
              txnHash: input.txnHash,
              txnHashNormalized: input.txnHashNormalized,
              webhookMetadata: {
                streamId: input.streamId,
                tag: input.tag,
                transaction: toTransactionNode(transaction),
              },
            },
          },
          { session },
        );
      };
      await (session ? session.withTransaction(work) : work());

      return "completed";
    } catch (caughtError) {
      if (
        caughtError &&
        typeof caughtError === "object" &&
        "code" in caughtError &&
        caughtError.code === 11000
      ) {
        return "duplicate";
      }

      await PaymentIntentModel.updateOne(
        { _id: input.intent._id },
        {
          $set: {
            failureReason: caughtError instanceof Error ? caughtError.message : "Payment failed.",
            status: "failed",
          },
        },
      );

      throw caughtError;
    } finally {
      await session?.endSession();
    }
  }
}

export const paymentService = new PaymentService();
