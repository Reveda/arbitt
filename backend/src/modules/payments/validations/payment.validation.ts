import { z } from "zod";
import { PAYMENT_NETWORKS } from "../constants/payment-networks";

export const createPlanPaymentIntentSchema = z.object({
  amountUsdt: z.coerce.number().positive(),
  network: z.enum(PAYMENT_NETWORKS),
  tier: z.string().trim().min(1).max(80),
});

export const createDepositPaymentIntentSchema = z.object({
  amountUsdt: z.coerce
    .number()
    .min(100, "Minimum deposit amount is 100 USDT.")
    .max(50000, "Maximum deposit amount is 50000 USDT."),
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
