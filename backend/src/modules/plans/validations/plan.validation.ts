import { z } from "zod";

export const purchasePlanSchema = z.object({
  amountUsdt: z.coerce
    .number()
    .positive("Purchase amount must be greater than 0.")
    .max(50000, "Purchase amount cannot exceed 50000 USDT."),
  tier: z.string().trim().min(1, "Plan tier is required.").max(40),
});
