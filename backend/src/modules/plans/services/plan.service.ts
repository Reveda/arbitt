import { planRepository } from "../repositories/plan.repository";
import type { PlanRuleSetDocument } from "../models/plan-rule-set.model";
import { HTTP_STATUS } from "../../../constants/http";
import { ApiError } from "../../../utils/ApiError";
import { TransactionModel } from "../../transactions/models/transaction.model";
import { toTransactionNode } from "../../transactions/dtos/transaction.dto";
import { rewardService } from "../../rewards/services/reward.service";
import { walletRepository } from "../../wallet/repositories/wallet.repository";
import { UserPlanPurchaseModel } from "../models/user-plan-purchase.model";
import type {
  ListPlanPurchasesResponseDto,
  ListPlansResponseDto,
  PlanDto,
  PlanPurchaseDto,
  PlanRuleSetDto,
  PlanRuleSetResponseDto,
  PurchasePlanResponseDto,
} from "../dtos/plan.dto";
import type { purchasePlanSchema } from "../validations/plan.validation";
import type { z } from "zod";

type PlanRuleSetRecord = PlanRuleSetDocument & {
  _id?: unknown;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};
type PurchasePlanInput = z.infer<typeof purchasePlanSchema>;

const defaultTerms = {
  withdrawalDay: "Weekly",
  settlementTime: "T+1",
  royaltyWithdrawal: "Monthly",
  levelIncomeCycle: "Once per sale and daily withdrawable",
};

function getStatus(isActive?: boolean) {
  return isActive === false ? "Inactive" : "Active";
}

function toPlanDto(plan: {
  _id?: unknown;
  createdAt?: Date | string | null;
  dailyReturnPercent?: number;
  isActive?: boolean;
  name?: string;
  priceUsdt?: number;
  totalReturnPercent?: number;
  updatedAt?: Date | string | null;
  validityDays?: number;
}): PlanDto {
  return {
    id: String(plan._id),
    name: plan.name ?? "",
    priceUsdt: plan.priceUsdt ?? 0,
    validityDays: plan.validityDays ?? 0,
    dailyReturnPercent: plan.dailyReturnPercent ?? 0,
    totalReturnPercent: plan.totalReturnPercent ?? 0,
    isActive: plan.isActive !== false,
    createdAt: plan.createdAt ?? null,
    updatedAt: plan.updatedAt ?? null,
  };
}

function toPlanRuleSetDto(ruleSet: PlanRuleSetRecord): PlanRuleSetDto {
  const terms = ruleSet.terms ?? defaultTerms;

  return {
    id: String(ruleSet._id),
    key: ruleSet.key,
    version: ruleSet.version,
    investmentTiers: ruleSet.investmentTiers.map((tier) => ({
      tier: tier.tier,
      name: tier.name,
      minUsdt: tier.minUsdt,
      maxUsdt: tier.maxUsdt,
      returnMinPercent: tier.weeklyReturnMinPercent,
      returnMaxPercent: tier.weeklyReturnMaxPercent,
      status: getStatus(tier.isActive),
    })),
    levelIncomeRules: ruleSet.levelIncomeRules.map((rule) => ({
      level: `L${rule.level}`,
      percent: rule.percent,
      status: getStatus(rule.isActive),
    })),
    salaryRoyaltyRules: ruleSet.salaryRoyaltyRules.map((rule) => ({
      tier: rule.tier,
      royaltyPool: rule.royaltyPool,
      directRequired: rule.directRequired,
      requiredDirectTier: rule.requiredDirectTier ?? null,
      bonusUsdt: rule.bonusUsdt,
      status: getStatus(rule.isActive),
    })),
    terms: {
      withdrawalDay: terms.withdrawalDay,
      settlementTime: terms.settlementTime,
      royaltyWithdrawal: terms.royaltyWithdrawal ?? defaultTerms.royaltyWithdrawal,
      levelIncomeCycle: terms.levelIncomeCycle ?? defaultTerms.levelIncomeCycle,
    },
    isActive: ruleSet.isActive,
    createdAt: ruleSet.createdAt ?? null,
    updatedAt: ruleSet.updatedAt ?? null,
  };
}

function toPlanPurchaseDto(record: {
  _id?: unknown;
  amountUsdt?: number;
  createdAt?: Date | string | null;
  name?: string;
  purchasedAt?: Date | string | null;
  sourceTransactionId?: unknown;
  status?: string;
  tier?: string;
  updatedAt?: Date | string | null;
  weeklyReturnPercent?: number;
}): PlanPurchaseDto {
  return {
    id: String(record._id),
    amountUsdt: record.amountUsdt ?? 0,
    createdAt: record.createdAt ?? null,
    name: record.name ?? "",
    purchasedAt: record.purchasedAt ?? null,
    sourceTransactionId: record.sourceTransactionId ? String(record.sourceTransactionId) : null,
    status: record.status ?? "active",
    tier: record.tier ?? "",
    updatedAt: record.updatedAt ?? null,
    weeklyReturnPercent: record.weeklyReturnPercent ?? 0,
  };
}

function getPlanPurchaseName(notes?: string | null, tier?: string | null) {
  const normalized = notes?.replace(/^Plan purchase(?:\s+(?:request|approved))?:\s*/i, "").trim();

  if (normalized) {
    return normalized;
  }

  return tier ?? "Investment Pool";
}

function toPlanPurchaseTransactionDto(record: {
  _id?: unknown;
  amountUsdt?: number;
  createdAt?: Date | string | null;
  notes?: string | null;
  payoutPercent?: number | null;
  payoutTier?: string | null;
  reviewedAt?: Date | string | null;
  status?: string;
  updatedAt?: Date | string | null;
}): PlanPurchaseDto {
  return {
    id: String(record._id),
    amountUsdt: record.amountUsdt ?? 0,
    createdAt: record.createdAt ?? null,
    name: getPlanPurchaseName(record.notes, record.payoutTier),
    purchasedAt: record.reviewedAt ?? null,
    sourceTransactionId: String(record._id),
    status: record.status ?? "pending",
    tier: record.payoutTier ?? "",
    updatedAt: record.updatedAt ?? null,
    weeklyReturnPercent: record.payoutPercent ?? 0,
  };
}

export class PlanService {
  async listPlans(): Promise<ListPlansResponseDto> {
    const plans = await planRepository.findActivePlans();
    return { plans: plans.map((plan) => toPlanDto(plan)) };
  }

  async getPlanRuleSet(): Promise<PlanRuleSetResponseDto> {
    const ruleSet = await planRepository.ensureDefaultRuleSet();
    return { ruleSet: toPlanRuleSetDto(ruleSet as PlanRuleSetRecord) };
  }

  async listMyPurchases(userId: string): Promise<ListPlanPurchasesResponseDto> {
    const purchaseTransactions = await TransactionModel.find({ userId, type: "plan_purchase" })
      .sort({ createdAt: -1 })
      .lean();

    if (purchaseTransactions.length) {
      return {
        purchases: purchaseTransactions.map((purchase) => toPlanPurchaseTransactionDto(purchase)),
      };
    }

    const purchases = await UserPlanPurchaseModel.find({ userId })
      .sort({ purchasedAt: -1, createdAt: -1 })
      .lean();

    return { purchases: purchases.map((purchase) => toPlanPurchaseDto(purchase)) };
  }

  async purchasePlan(userId: string, input: PurchasePlanInput): Promise<PurchasePlanResponseDto> {
    const amountUsdt = Math.round(input.amountUsdt * 100) / 100;
    const ruleSet = await planRepository.ensureDefaultRuleSet();
    const tier = [...ruleSet.investmentTiers].find(
      (candidate) => candidate.isActive !== false && candidate.tier === input.tier.trim(),
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

    await walletRepository.ensureWallet(userId);
    const wallet = await walletRepository.lockPlanAmount(userId, amountUsdt);

    if (!wallet) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Insufficient wallet balance for this plan purchase.",
      );
    }

    try {
      const purchasedAt = new Date();
      const transaction = await TransactionModel.create({
        amountUsdt,
        network: "SYSTEM",
        notes: `Plan purchase: ${tier.name}`,
        payoutPercent: tier.weeklyReturnMaxPercent,
        payoutPrincipalUsdt: amountUsdt,
        payoutTier: tier.tier,
        reviewedAt: purchasedAt,
        status: "completed",
        type: "plan_purchase",
        userId,
      });
      const [purchase] = await Promise.all([
        UserPlanPurchaseModel.findOneAndUpdate(
          { sourceTransactionId: transaction._id },
          {
            $set: {
              amountUsdt,
              name: tier.name,
              sourceTransactionId: transaction._id,
              status: "active",
              tier: tier.tier,
              userId,
              weeklyReturnPercent: tier.weeklyReturnMaxPercent,
            },
            $setOnInsert: {
              purchasedAt,
            },
          },
          { new: true, upsert: true },
        ),
        walletRepository.creditAdminPlanPurchase(amountUsdt),
      ]);

      await rewardService.createLevelIncomeRewardsForPlanPurchase({
        amountUsdt,
        transactionId: String(transaction._id),
        userId,
      });

      return {
        purchase: purchase
          ? toPlanPurchaseDto(purchase)
          : toPlanPurchaseTransactionDto(transaction),
        transaction: toTransactionNode(transaction),
        wallet: {
          availableUsdt: wallet.availableUsdt ?? 0,
          lockedUsdt: wallet.lockedUsdt ?? 0,
          lifetimeDepositsUsdt: wallet.lifetimeDepositsUsdt ?? 0,
          lifetimeRewardsUsdt: wallet.lifetimeRewardsUsdt ?? 0,
          lifetimeWithdrawalsUsdt: wallet.lifetimeWithdrawalsUsdt ?? 0,
        },
      };
    } catch (caughtError) {
      await walletRepository.unlockPlanAmount(userId, amountUsdt);
      throw caughtError;
    }
  }
}

export const planService = new PlanService();
