import { Schema, model, type InferSchemaType } from "mongoose";

const investmentTierSchema = new Schema(
  {
    tier: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    minUsdt: { type: Number, required: true, min: 0 },
    maxUsdt: { type: Number, required: true, min: 0 },
    weeklyReturnMinPercent: { type: Number, required: true, min: 0 },
    weeklyReturnMaxPercent: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const levelIncomeRuleSchema = new Schema(
  {
    level: { type: Number, required: true, min: 1 },
    percent: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const salaryRoyaltyRuleSchema = new Schema(
  {
    tier: { type: String, required: true, trim: true },
    royaltyPool: { type: String, required: true, trim: true },
    directRequired: { type: Number, required: true, min: 0 },
    requiredDirectTier: { type: String, trim: true, default: null },
    bonusUsdt: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const planRuleSetSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    investmentTiers: {
      type: [investmentTierSchema],
      required: true,
      default: [],
    },
    levelIncomeRules: {
      type: [levelIncomeRuleSchema],
      required: true,
      default: [],
    },
    salaryRoyaltyRules: {
      type: [salaryRoyaltyRuleSchema],
      required: true,
      default: [],
    },
    terms: {
      withdrawalDay: { type: String, required: true, trim: true, default: "Weekly" },
      settlementTime: { type: String, required: true, trim: true, default: "T+1" },
      royaltyWithdrawal: { type: String, required: true, trim: true, default: "Monthly" },
      levelIncomeCycle: {
        type: String,
        required: true,
        trim: true,
        default: "Once per sale and daily withdrawable",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export type PlanRuleSetDocument = InferSchemaType<typeof planRuleSetSchema>;
export const PlanRuleSetModel = model("PlanRuleSet", planRuleSetSchema);
