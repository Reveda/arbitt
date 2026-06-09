import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import type {
  ListPlanPurchasesResponseDto,
  ListPlansResponseDto,
  PlanRuleSetResponseDto,
  PurchasePlanResponseDto,
} from "../dtos/plan.dto";
import { planService } from "../services/plan.service";
import { purchasePlanSchema } from "../validations/plan.validation";

export const listPlans = catchAsync(async (_req: Request, res: Response) => {
  const result = await planService.listPlans();
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<ListPlansResponseDto>(HTTP_STATUS.OK, "Plans loaded.", result));
});

export const getPlanRuleSet = catchAsync(async (_req: Request, res: Response) => {
  const result = await planService.getPlanRuleSet();
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<PlanRuleSetResponseDto>(HTTP_STATUS.OK, "Plan rules loaded.", result));
});

export const listMyPlanPurchases = catchAsync(async (req: Request, res: Response) => {
  const result = await planService.listMyPurchases(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<ListPlanPurchasesResponseDto>(HTTP_STATUS.OK, "Plan purchases loaded.", result),
    );
});

export const purchasePlan = catchAsync(async (req: Request, res: Response) => {
  const input = purchasePlanSchema.parse(req.body);
  const result = await planService.purchasePlan(req.user!.id, input);
  res
    .status(HTTP_STATUS.CREATED)
    .json(apiResponse<PurchasePlanResponseDto>(HTTP_STATUS.CREATED, "Plan purchased.", result));
});
