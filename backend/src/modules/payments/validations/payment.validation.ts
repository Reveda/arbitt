import { z } from "zod";
import { PAYMENT_NETWORKS } from "../constants/payment-networks";
import { usdtAmount } from "../../../utils/amountValidation";

export const createPlanPaymentIntentSchema = z.object({
  amountUsdt: usdtAmount({ min: 0.01, minMessage: "Amount must be greater than 0." }),
  network: z.enum(PAYMENT_NETWORKS),
  tier: z.string().trim().min(1).max(80),
});

export const createDepositPaymentIntentSchema = z.object({
  amountUsdt: usdtAmount({ min: 100, max: 50000, minMessage: "Minimum deposit amount is 100 USDT.", maxMessage: "Maximum deposit amount is 50000 USDT." }),
  network: z.enum(PAYMENT_NETWORKS),
});

export const paymentIntentParamsSchema = z.object({
  intentId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid payment intent id."),
});

export const submitPaymentIntentTxHashSchema = z.object({
  txnHash: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{64}$/, "Enter a valid EVM transaction hash."),
});
