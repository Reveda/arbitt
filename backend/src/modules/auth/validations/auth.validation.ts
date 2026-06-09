import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z
      .string()
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
        "Password must be at least 8 characters with letters and numbers.",
      ),
    confirmPassword: z.string().min(8),
    username: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9_]{3,24}$/, "Use 3-24 characters (letters, numbers, underscore)."),
    invitationCode: z.string().trim().min(1, "Invitation code is required.").max(64),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const emailOtpRequestSchema = z.object({
  email: z.string().email(),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit OTP."),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit OTP."),
    password: z
      .string()
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
        "Password must be at least 8 characters with letters and numbers.",
      ),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
