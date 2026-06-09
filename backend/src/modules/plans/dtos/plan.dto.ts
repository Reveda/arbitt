import type { TransactionDto } from "../../transactions/dtos/transaction.dto";
import type { WalletBalanceDto } from "../../wallet/dtos/wallet.dto";

export type PlanDto = {
  id: string;
  name: string;
  priceUsdt: number;
  validityDays: number;
  dailyReturnPercent: number;
  totalReturnPercent: number;
  isActive: boolean;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
};

export type InvestmentTierRuleDto = {
  tier: string;
  name: string;
  minUsdt: number;
  maxUsdt: number;
  returnMinPercent: number;
  returnMaxPercent: number;
  status: string;
};

export type LevelIncomeRuleDto = {
  level: string;
  percent: number;
  status: string;
};

export type SalaryRoyaltyRuleDto = {
  tier: string;
  royaltyPool: string;
  directRequired: number;
  requiredDirectTier: string | null;
  bonusUsdt: number;
  status: string;
};

export type PlanRuleSetDto = {
  id: string;
  key: string;
  version: number;
  investmentTiers: InvestmentTierRuleDto[];
  levelIncomeRules: LevelIncomeRuleDto[];
  salaryRoyaltyRules: SalaryRoyaltyRuleDto[];
  terms: {
    withdrawalDay: string;
    settlementTime: string;
    royaltyWithdrawal: string;
    levelIncomeCycle: string;
  };
  isActive: boolean;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
};

export type PlanPurchaseDto = {
  id: string;
  amountUsdt: number;
  createdAt: Date | string | null;
  name: string;
  purchasedAt: Date | string | null;
  sourceTransactionId: string | null;
  status: string;
  tier: string;
  updatedAt: Date | string | null;
  weeklyReturnPercent: number;
};

export type ListPlansResponseDto = {
  plans: PlanDto[];
};

export type PlanRuleSetResponseDto = {
  ruleSet: PlanRuleSetDto;
};

export type ListPlanPurchasesResponseDto = {
  purchases: PlanPurchaseDto[];
};

export type PurchasePlanResponseDto = {
  purchase: PlanPurchaseDto | null;
  transaction: TransactionDto;
  wallet: WalletBalanceDto;
};
