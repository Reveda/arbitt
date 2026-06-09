export type PlanRepositoryRecord = {
  _id?: unknown;
  name?: string;
  priceUsdt?: number;
  validityDays?: number;
  dailyReturnPercent?: number;
  totalReturnPercent?: number;
  isActive?: boolean;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

export type PlanRuleSetRepositoryRecord = {
  _id?: unknown;
  key: string;
  version: number;
  investmentTiers: Array<{
    tier: string;
    name: string;
    minUsdt: number;
    maxUsdt: number;
    weeklyReturnMinPercent: number;
    weeklyReturnMaxPercent: number;
    isActive?: boolean;
  }>;
  levelIncomeRules: Array<{
    level: number;
    percent: number;
    isActive?: boolean;
  }>;
  salaryRoyaltyRules: Array<{
    tier: string;
    royaltyPool: string;
    directRequired: number;
    requiredDirectTier?: string | null;
    bonusUsdt: number;
    isActive?: boolean;
  }>;
  terms?: {
    withdrawalDay?: string;
    settlementTime?: string;
    royaltyWithdrawal?: string;
    levelIncomeCycle?: string;
  };
  isActive: boolean;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};
