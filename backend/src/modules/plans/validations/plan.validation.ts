import { z } from "zod";
import { usdtAmount } from "../../../utils/amountValidation";

export const purchasePlanSchema = z.object({
  amountUsdt: usdtAmount({ min: 0.01, max: 50000, minMessage: "Purchase amount must be greater than 0.", maxMessage: "Purchase amount cannot exceed 50000 USDT." }),
  tier: z.string().trim().min(1, "Plan tier is required.").max(40),
});
