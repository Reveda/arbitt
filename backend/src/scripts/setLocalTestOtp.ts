import { connectDatabase, disconnectDatabase } from "../config/database";
import { env } from "../config/env";
import { UserModel } from "../modules/users/models/user.model";
import { hashToken } from "../modules/auth/utils/token";

type OtpPurpose = "email-verification" | "password-reset";

type ScriptOptions = {
  email: string;
  minutes: number;
  otp: string;
  purpose: OtpPurpose;
};

function getArgValue(name: string) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length).trim();
  }

  const index = process.argv.findIndex((arg) => arg === `--${name}`);

  if (index >= 0) {
    return process.argv[index + 1]?.trim();
  }

  return undefined;
}

function printUsage() {
  console.log(
    [
      "Usage:",
      "  npm run auth:set-test-otp -- --email user@example.com --otp 123456",
      "  npm run auth:set-test-otp -- --email user@example.com --otp 123456 --purpose password-reset",
      "",
      "Options:",
      "  --email     User email in local DB",
      "  --otp       Known 6-digit OTP to set",
      "  --purpose   email-verification or password-reset (default: email-verification)",
      "  --minutes   Expiry minutes from now (default: 10)",
    ].join("\n"),
  );
}

function parseOptions(): ScriptOptions {
  const email = getArgValue("email")?.toLowerCase();
  const otp = getArgValue("otp");
  const purpose = (getArgValue("purpose") ?? "email-verification") as OtpPurpose;
  const minutes = Number(getArgValue("minutes") ?? 10);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Pass a valid --email value.");
  }

  if (!otp || !/^\d{6}$/.test(otp)) {
    throw new Error("Pass a valid 6-digit --otp value.");
  }

  if (!["email-verification", "password-reset"].includes(purpose)) {
    throw new Error("--purpose must be email-verification or password-reset.");
  }

  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("--minutes must be a positive number.");
  }

  return {
    email,
    minutes,
    otp,
    purpose,
  };
}

function hashOtp(purpose: OtpPurpose, email: string, otp: string) {
  return hashToken(`${purpose}:${email.toLowerCase().trim()}:${otp}`);
}

async function setLocalTestOtp() {
  if (env.NODE_ENV === "production") {
    throw new Error("This local test OTP script is blocked in production.");
  }

  const options = parseOptions();
  const expiresAt = new Date(Date.now() + options.minutes * 60_000);
  const otpHash = hashOtp(options.purpose, options.email, options.otp);
  const update =
    options.purpose === "email-verification"
      ? {
          emailVerificationOtpAttempts: 0,
          emailVerificationOtpExpiresAt: expiresAt,
          emailVerificationOtpHash: otpHash,
        }
      : {
          passwordResetOtpAttempts: 0,
          passwordResetOtpExpiresAt: expiresAt,
          passwordResetOtpHash: otpHash,
        };

  await connectDatabase();

  const user = await UserModel.findOneAndUpdate(
    { email: options.email },
    { $set: update },
    { new: true },
  ).lean();

  if (!user) {
    throw new Error(`No user found for ${options.email}.`);
  }

  console.log(
    [
      "Local test OTP set.",
      `Email: ${options.email}`,
      `Purpose: ${options.purpose}`,
      `OTP: ${options.otp}`,
      `ExpiresAt: ${expiresAt.toISOString()}`,
    ].join("\n"),
  );
}

setLocalTestOtp()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    printUsage();
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
