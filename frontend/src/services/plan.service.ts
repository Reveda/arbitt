import { apiRequest } from "@/api/apiClient";
import { API_ENDPOINTS } from "@/api/endpoints";

export type InvestmentTierRule = {
  tier: string;
  name: string;
  minUsdt: number;
  maxUsdt: number;
  returnMinPercent: number;
  returnMaxPercent: number;
  status: string;
  packagesSold?: number;
};

export type LevelIncomeRule = {
  level: string;
  percent: number;
  status: string;
};

export type SalaryRoyaltyRule = {
  tier: string;
  royaltyPool: string;
  directRequired: number;
  requiredDirectTier: string | null;
  bonusUsdt: number;
  status: string;
};

export type PlanRuleSet = {
  id: string;
  key: string;
  version: number;
  investmentTiers: InvestmentTierRule[];
  levelIncomeRules: LevelIncomeRule[];
  salaryRoyaltyRules: SalaryRoyaltyRule[];
  terms: {
    withdrawalDay: string;
    settlementTime: string;
    royaltyWithdrawal: string;
    levelIncomeCycle: string;
  };
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PlanRuleSetResponse = {
  ruleSet: PlanRuleSet;
};

export type PlanPurchase = {
  id: string;
  amountUsdt: number;
  createdAt: string | null;
  name: string;
  purchasedAt: string | null;
  sourceTransactionId: string | null;
  status: "active" | "completed" | "pending" | "rejected" | "failed" | "cancelled";
  tier: string;
  updatedAt: string | null;
  weeklyReturnPercent: number;
};

export type PlanPurchasesResponse = {
  purchases: PlanPurchase[];
};

export type PurchasePlanInput = {
  tier: string;
  amountUsdt: number;
};

export type PurchasePlanResponse = {
  purchase: PlanPurchase | null;
  transaction: {
    id: string;
    type: string;
    status: string;
    amountUsdt: number;
    createdAt: string | null;
  };
  wallet: {
    availableUsdt: number;
    lockedUsdt: number;
    lifetimeDepositsUsdt: number;
    lifetimeWithdrawalsUsdt: number;
    lifetimeRewardsUsdt: number;
  };
};

export const planService = {
  getRuleSet() {
    return apiRequest<PlanRuleSetResponse>(API_ENDPOINTS.plans.rules);
  },

  listPurchases() {
    return apiRequest<PlanPurchasesResponse>(API_ENDPOINTS.plans.purchases);
  },

  purchasePlan(input: PurchasePlanInput) {
    return apiRequest<PurchasePlanResponse>(API_ENDPOINTS.plans.purchases, {
      method: "POST",
      body: input
    });
  }
};
