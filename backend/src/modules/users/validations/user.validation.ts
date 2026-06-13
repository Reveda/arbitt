import { z } from "zod";

const transactionPasswordSchema = z
  .string()
  .trim()
  .min(6, "Transaction password must be at least 6 characters.")
  .max(64, "Transaction password cannot exceed 64 characters.");

export const updateWalletAddressSchema = z.object({
  walletAddress: z
    .string({ required_error: "Wallet address is required." })
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Wallet address must be a valid BEP20 address."),
});

export const updateTransactionPasswordSchema = z
  .object({
    currentTransactionPassword: z.string().trim().optional(),
    transactionPassword: transactionPasswordSchema,
    confirmTransactionPassword: transactionPasswordSchema,
  })
  .refine((value) => value.transactionPassword === value.confirmTransactionPassword, {
    message: "Transaction passwords do not match.",
    path: ["confirmTransactionPassword"],
  });
