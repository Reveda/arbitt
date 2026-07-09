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

export const requestWalletAddressChangeOtpSchema = z.object({
  walletAddress: z
    .string({ required_error: "Wallet address is required." })
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Wallet address must be a valid BEP20 address."),
});

export const verifyWalletAddressChangeOtpSchema = z.object({
  walletAddress: z
    .string({ required_error: "Wallet address is required." })
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Wallet address must be a valid BEP20 address."),
  otp: z
    .string({ required_error: "OTP is required." })
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit OTP."),
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

export const createSupportTicketSchema = z.object({
  subject: z
    .string({ required_error: "Subject is required." })
    .trim()
    .min(1, "Subject cannot be empty.")
    .max(150, "Subject cannot exceed 150 characters."),
  message: z
    .string({ required_error: "Message is required." })
    .trim()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message cannot exceed 2000 characters."),
});
