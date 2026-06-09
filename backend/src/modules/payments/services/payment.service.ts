import { timingSafeEqual } from "node:crypto";
import { keccak256 } from "ethereum-cryptography/keccak";
import { bytesToHex, utf8ToBytes } from "ethereum-cryptography/utils";
import { HTTP_STATUS } from "../../../constants/http";
import { env } from "../../../config/env";
import { ApiError } from "../../../utils/ApiError";
import { planRepository } from "../../plans/repositories/plan.repository";
import { UserPlanPurchaseModel } from "../../plans/models/user-plan-purchase.model";
import { rewardService } from "../../rewards/services/reward.service";
import { toTransactionNode } from "../../transactions/dtos/transaction.dto";
import { TransactionModel } from "../../transactions/models/transaction.model";
import { getPlatformPaymentWalletForNetwork } from "../../admin/services/payment-wallet.service";
import { walletRepository } from "../../wallet/repositories/wallet.repository";
import {
  getPaymentNetworkByChainId,
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
  type MoralisWebhookResponseDto,
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

type MoralisErc20Transfer = {
  transactionHash?: string;
  logIndex?: string;
  contract?: string;
  from?: string;
  to?: string;
  value?: string;
  tokenDecimals?: string | number;
  possibleSpam?: boolean;
  valueWithDecimals?: string;
};

type MoralisWebhookBody = {
  confirmed?: boolean;
  chainId?: string;
  streamId?: string;
  tag?: string;
  block?: {
    hash?: string;
    number?: string;
    timestamp?: string;
  };
  erc20Transfers?: MoralisErc20Transfer[];
};

type WebhookTransferResult = "ambiguous" | "completed" | "detected" | "duplicate" | "ignored";

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

function normalizeLogIndex(value?: string | null) {
  return value?.trim() || "0";
}

function getTransferTokenUnits(transfer: MoralisErc20Transfer, decimals: number) {
  if (transfer.value && /^\d+$/.test(transfer.value)) {
    return transfer.value;
  }

  if (transfer.valueWithDecimals) {
    return decimalToTokenUnits(transfer.valueWithDecimals, decimals);
  }

  return "";
}

function getSignatureValue(signature: string | string[] | undefined) {
  return Array.isArray(signature) ? signature[0] : signature;
}

function safeCompareHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left.toLowerCase());
  const rightBuffer = Buffer.from(right.toLowerCase());

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyMoralisSignature(body: unknown, signatureHeader: string | string[] | undefined) {
  const secret = env.MORALIS_STREAM_WEBHOOK_SECRET?.trim();

  if (!secret) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Moralis webhook secret is not configured.",
    );
  }

  const providedSignature = getSignatureValue(signatureHeader)?.trim();

  if (!providedSignature) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Moralis webhook signature is missing.");
  }

  const expectedSignature = `0x${bytesToHex(
    keccak256(utf8ToBytes(`${JSON.stringify(body)}${secret}`)),
  )}`;

  if (!safeCompareHex(expectedSignature, providedSignature)) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Moralis webhook signature is invalid.");
  }
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

export class PaymentService {
  async createDepositPaymentIntent(
    userId: string,
    input: CreateDepositPaymentIntentInput,
  ): Promise<CreateDepositPaymentIntentResponseDto> {
    const amountUsdt = roundUsdt(input.amountUsdt);
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
      amountTokenUnits: decimalToTokenUnits(amountUsdt, networkConfig.tokenDecimals),
      amountUsdt,
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
  ): Promise<CreatePlanPaymentIntentResponseDto> {
    const amountUsdt = roundUsdt(input.amountUsdt);
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
      amountTokenUnits: decimalToTokenUnits(amountUsdt, networkConfig.tokenDecimals),
      amountUsdt,
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

    if (intent.status === "pending" || intent.status === "detected") {
      const refreshedIntent = await PaymentIntentModel.findById(intent._id).lean();
      return { intent: toPaymentIntentDto(refreshedIntent ?? intent) };
    }

    return { intent: toPaymentIntentDto(intent) };
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

    return { intent: toPaymentIntentDto(updatedIntent ?? intent) };
  }

  async processMoralisWebhook(input: {
    body: MoralisWebhookBody;
    signature: string | string[] | undefined;
  }): Promise<MoralisWebhookResponseDto> {
    verifyMoralisSignature(input.body, input.signature);

    const transfers = Array.isArray(input.body.erc20Transfers) ? input.body.erc20Transfers : [];
    const response: MoralisWebhookResponseDto = {
      ambiguousCount: 0,
      completedCount: 0,
      detectedCount: 0,
      duplicateCount: 0,
      ignoredCount: 0,
      receivedTransferCount: transfers.length,
      status: input.body.confirmed ? "processed" : "detected_unconfirmed",
    };

    if (!transfers.length) {
      response.status = "no_transfers";
      return response;
    }

    const networkConfig = getPaymentNetworkByChainId(input.body.chainId);

    if (!networkConfig) {
      response.ignoredCount = transfers.length;
      response.status = "unsupported_chain";
      return response;
    }

    for (const transfer of transfers) {
      const result = await this.processMoralisTransfer({
        confirmed: input.body.confirmed === true,
        network: networkConfig.network,
        streamId: input.body.streamId ?? null,
        tag: input.body.tag ?? null,
        transfer,
      });

      if (result === "ambiguous") {
        response.ambiguousCount += 1;
      } else if (result === "completed") {
        response.completedCount += 1;
      } else if (result === "detected") {
        response.detectedCount += 1;
      } else if (result === "duplicate") {
        response.duplicateCount += 1;
      } else {
        response.ignoredCount += 1;
      }
    }

    return response;
  }

  private async processMoralisTransfer(input: {
    confirmed: boolean;
    network: PaymentNetwork;
    streamId: string | null;
    tag: string | null;
    transfer: MoralisErc20Transfer;
  }): Promise<WebhookTransferResult> {
    const networkConfig = PAYMENT_NETWORK_CONFIGS[input.network];
    const txnHash = input.transfer.transactionHash?.trim();
    const txnHashNormalized = normalizeHash(txnHash);
    const logIndex = normalizeLogIndex(input.transfer.logIndex);
    const tokenContract = normalizeEvmAddress(input.transfer.contract);
    const receiverAddress = normalizeEvmAddress(input.transfer.to);
    const senderAddress = input.transfer.from?.trim() ?? null;
    const senderAddressNormalized = normalizeEvmAddress(senderAddress);
    const amountTokenUnits = getTransferTokenUnits(input.transfer, networkConfig.tokenDecimals);

    if (
      !txnHash ||
      !txnHashNormalized ||
      !amountTokenUnits ||
      input.transfer.possibleSpam === true ||
      tokenContract !== normalizeEvmAddress(networkConfig.tokenContract)
    ) {
      return "ignored";
    }

    const intent = await this.findMatchingIntent({
      amountTokenUnits,
      chainId: networkConfig.chainId,
      logIndex,
      receiverAddress,
      tokenContract,
      txnHashNormalized,
    });

    if (!intent) {
      return "ignored";
    }

    if (await expireOldIntent(intent)) {
      return "ignored";
    }

    if (!input.confirmed) {
      await PaymentIntentModel.updateOne(
        { _id: intent._id, status: { $in: MATCHABLE_INTENT_STATUSES } },
        {
          $set: {
            detectedAt: new Date(),
            logIndex,
            senderAddress,
            senderAddressNormalized,
            status: "detected",
            txnHash,
            txnHashNormalized,
            webhookMetadata: {
              streamId: input.streamId,
              tag: input.tag,
            },
          },
        },
      );
      return "detected";
    }

    return this.completePaymentIntent({
      intent,
      logIndex,
      senderAddress,
      senderAddressNormalized,
      streamId: input.streamId,
      tag: input.tag,
      txnHash,
      txnHashNormalized,
    });
  }

  private async findMatchingIntent(input: {
    amountTokenUnits: string;
    chainId: string;
    logIndex: string;
    receiverAddress: string;
    tokenContract: string;
    txnHashNormalized: string;
  }): Promise<PaymentIntentRecord | null> {
    const byHash = (await PaymentIntentModel.findOne({
      amountTokenUnits: input.amountTokenUnits,
      chainId: input.chainId.toLowerCase(),
      receiverAddressNormalized: input.receiverAddress,
      status: { $in: MATCHABLE_INTENT_STATUSES },
      tokenContract: input.tokenContract,
      txnHashNormalized: input.txnHashNormalized,
    })
      .sort({ createdAt: 1 })
      .lean()) as PaymentIntentRecord | null;

    if (byHash) {
      return byHash;
    }

    const candidates = (await PaymentIntentModel.find({
      amountTokenUnits: input.amountTokenUnits,
      chainId: input.chainId.toLowerCase(),
      expiresAt: { $gte: new Date() },
      receiverAddressNormalized: input.receiverAddress,
      status: { $in: MATCHABLE_INTENT_STATUSES },
      tokenContract: input.tokenContract,
      txnHashNormalized: { $in: [null, ""] },
    })
      .sort({ createdAt: 1 })
      .limit(2)
      .lean()) as PaymentIntentRecord[];

    if (candidates.length === 1) {
      return candidates[0];
    }

    if (candidates.length > 1) {
      await PaymentIntentModel.updateMany(
        { _id: { $in: candidates.map((candidate) => candidate._id) } },
        {
          $set: {
            failureReason:
              "Multiple pending payment intents match this transfer. Ask user to submit tx hash.",
            status: "ambiguous",
          },
        },
      );
    }

    return null;
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
  }): Promise<WebhookTransferResult> {
    const existingTransaction = await TransactionModel.findOne({
      txnHash: input.txnHash,
    }).lean();

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
      );

      return "duplicate";
    }

    if (input.intent.type === WALLET_DEPOSIT_INTENT_TYPE) {
      return this.completeWalletDepositIntent(input);
    }

    try {
      const purchasedAt = new Date();
      const transaction = await TransactionModel.create({
        amountUsdt: input.intent.amountUsdt,
        network: input.intent.network,
        notes: `Moralis verified plan purchase: ${input.intent.planName}`,
        payoutPercent: input.intent.weeklyReturnPercent,
        payoutPrincipalUsdt: input.intent.amountUsdt,
        payoutTier: input.intent.tier,
        reviewedAt: purchasedAt,
        status: "completed",
        txnHash: input.txnHash,
        type: "plan_purchase",
        userId: input.intent.userId,
      });

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
          { new: true, upsert: true },
        ),
        walletRepository.creditAdminPlanPurchase(input.intent.amountUsdt),
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
        ),
      ]);

      await rewardService.createLevelIncomeRewardsForPlanPurchase({
        amountUsdt: input.intent.amountUsdt,
        transactionId: String(transaction._id),
        userId: String(input.intent.userId),
      });

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
  }): Promise<WebhookTransferResult> {
    try {
      const confirmedAt = new Date();
      const transaction = await TransactionModel.create({
        amountUsdt: input.intent.amountUsdt,
        network: input.intent.network,
        notes: `Moralis verified wallet top-up: ${input.intent.network}`,
        reviewedAt: confirmedAt,
        status: "completed",
        txnHash: input.txnHash,
        type: "deposit",
        userId: input.intent.userId,
      });

      await Promise.all([
        walletRepository.creditDeposit(String(input.intent.userId), input.intent.amountUsdt),
        PaymentIntentModel.updateOne(
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
        ),
      ]);

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
    }
  }
}

export const paymentService = new PaymentService();
