import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const durationPattern = /^\d+[smhd]$/;

const optionalBooleanString = z.preprocess((value) => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (value === "true" || value === true) {
    return true;
  }

  if (value === "false" || value === false) {
    return false;
  }

  return value;
}, z.boolean().optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(["development", "test", "production"]).default("development"),
    PROCESS_ROLE: z.enum(["api", "worker", "all"]).default("all"),
    PORT: z.coerce.number().int().positive().default(5000),
    API_PREFIX: z.string().startsWith("/").default("/api/v1"),
    FRONTEND_URL: z.string().default("http://localhost:5173"),
    MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/arbitrum"),
    REDIS_ENABLED: optionalBooleanString.default(false),
    REDIS_URL: z.string().min(1).default("redis://127.0.0.1:6379"),
    CACHE_KEY_PREFIX: z.string().min(1).default("arbitrum"),
    CACHE_PUBLIC_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),
    LOG_TO_FILE: optionalBooleanString.default(false),
    LOG_DIR: z.string().min(1).default("logs"),
    LOG_MAX_SIZE_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(10 * 1024 * 1024),
    LOG_MAX_FILES: z.coerce.number().int().positive().default(10),
    JWT_ACCESS_SECRET: z.string().min(32).default("change-me-local-access-secret-32chars"),
    JWT_REFRESH_SECRET: z.string().min(32).default("change-me-local-refresh-secret-32chars"),
    BSC_PRIMARY_RPC_URL: z.string().url().default("https://bsc-dataseed.binance.org/"),
    BSC_BACKUP_RPC_URL: z.string().url().default("https://bsc.publicnode.com"),
    PAYMENT_INTENT_EXPIRES_MINUTES: z.coerce.number().int().positive().default(60),
    PAYMENT_WALLET_ENCRYPTION_KEY: z.string().min(32).optional(),
    WITHDRAWAL_ADMIN_PRIVATE_KEY: z.string().optional(),
    JWT_ACCESS_EXPIRES_IN: z.string().regex(durationPattern).default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().regex(durationPattern).default("7d"),
    ACCESS_TOKEN_COOKIE_NAME: z.string().min(1).default("arbitrum_access_token"),
    REFRESH_TOKEN_COOKIE_NAME: z.string().min(1).default("arbitrum_refresh_token"),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    COOKIE_SECURE: optionalBooleanString,
    API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    API_ACTIVITY_TRACKING_ENABLED: optionalBooleanString.default(true),
    API_ACTIVITY_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
    AUTH_IDENTIFIER_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    AUTH_IDENTIFIER_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    OTP_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(600000),
    OTP_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(6),
    EXPOSE_AUTH_OTP_IN_TEST_MODE: optionalBooleanString.default(false),
    REFRESH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    REFRESH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    FINANCIAL_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    FINANCIAL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
    EMAIL_ENABLED: optionalBooleanString.default(false),
    EMAIL_QUEUE_ENABLED: optionalBooleanString.default(true),
    EMAIL_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(5),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_SECURE: optionalBooleanString.default(false),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
    EMAIL_FROM_NAME: z.string().min(1).default("Arbitrum"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") {
      return;
    }

    if (value.JWT_ACCESS_SECRET.startsWith("change-me")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JWT_ACCESS_SECRET must be replaced in production.",
        path: ["JWT_ACCESS_SECRET"],
      });
    }

    if (value.JWT_REFRESH_SECRET.startsWith("change-me")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JWT_REFRESH_SECRET must be replaced in production.",
        path: ["JWT_REFRESH_SECRET"],
      });
    }

    if (!value.PAYMENT_WALLET_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PAYMENT_WALLET_ENCRYPTION_KEY is required in production.",
        path: ["PAYMENT_WALLET_ENCRYPTION_KEY"],
      });
    }

    if (value.EXPOSE_AUTH_OTP_IN_TEST_MODE && value.APP_ENV !== "test") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "EXPOSE_AUTH_OTP_IN_TEST_MODE can only be enabled in production when APP_ENV=test.",
        path: ["EXPOSE_AUTH_OTP_IN_TEST_MODE"],
      });
    }

    if (value.EMAIL_ENABLED) {
      if (!value.SMTP_HOST) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SMTP_HOST is required when EMAIL_ENABLED is true.",
          path: ["SMTP_HOST"],
        });
      }

      if (!value.SMTP_PORT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SMTP_PORT is required when EMAIL_ENABLED is true.",
          path: ["SMTP_PORT"],
        });
      }

      if (!value.SMTP_USER) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SMTP_USER is required when EMAIL_ENABLED is true.",
          path: ["SMTP_USER"],
        });
      }

      if (!value.SMTP_PASS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SMTP_PASS is required when EMAIL_ENABLED is true.",
          path: ["SMTP_PASS"],
        });
      }

      if (!value.EMAIL_FROM) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "EMAIL_FROM is required when EMAIL_ENABLED is true.",
          path: ["EMAIL_FROM"],
        });
      }
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid backend environment variables:", parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsedEnv.data;

export const allowedOrigins = env.FRONTEND_URL.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
