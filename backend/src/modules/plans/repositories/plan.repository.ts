import { PlanModel } from "../models/plan.model";
import { DEFAULT_PLAN_RULE_SET_KEY, defaultPlanRuleSet } from "../constants/plan-rule-set.defaults";
import { PlanRuleSetModel } from "../models/plan-rule-set.model";
import type {
  PlanRepositoryRecord,
  PlanRuleSetRepositoryRecord,
} from "../types/plan.repository.types";

export class PlanRepository {
  async findActivePlans(): Promise<PlanRepositoryRecord[]> {
    return PlanModel.find({ isActive: true }).sort({ priceUsdt: 1 }).lean();
  }

  async findById(planId: string): Promise<PlanRepositoryRecord | null> {
    return PlanModel.findById(planId).lean();
  }

  countActivePlans(): Promise<number> {
    return PlanModel.countDocuments({ isActive: true });
  }

  async ensureDefaultRuleSet(): Promise<PlanRuleSetRepositoryRecord> {
    const { key, ...ruleSetDefaults } = defaultPlanRuleSet;

    const ruleSet = await PlanRuleSetModel.findOneAndUpdate(
      { key: DEFAULT_PLAN_RULE_SET_KEY },
      {
        $set: ruleSetDefaults,
        $setOnInsert: { key },
      },
      { new: true, setDefaultsOnInsert: true, upsert: true },
    ).lean();

    return ruleSet as PlanRuleSetRepositoryRecord;
  }
}

export const planRepository = new PlanRepository();
