import { env } from "../config/env";
import { hashToken } from "../modules/auth/utils/token";

type OtpPurpose = "email-verification" | "password-reset";

type ScriptOptions = {
  email: string;
  hash: string;
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
      "  npm run auth:check-otp-hash -- --email user@example.com --otp 123456 --hash <stored_hash>",
      "  npm run auth:check-otp-hash -- --email user@example.com --otp 123456 --hash <stored_hash> --purpose password-reset",
      "",
      "Options:",
      "  --email     User email used when OTP was generated",
      "  --otp       Candidate 6-digit OTP to check",
      "  --hash      Stored OTP hash from local DB",
      "  --purpose   email-verification or password-reset (default: email-verification)",
    ].join("\n"),
  );
}

function parseOptions(): ScriptOptions {
  const email = getArgValue("email")?.toLowerCase();
  const otp = getArgValue("otp");
  const hash = getArgValue("hash")?.toLowerCase();
  const purpose = (getArgValue("purpose") ?? "email-verification") as OtpPurpose;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Pass a valid --email value.");
  }

  if (!otp || !/^\d{6}$/.test(otp)) {
    throw new Error("Pass a valid 6-digit --otp value.");
  }

  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) {
    throw new Error("Pass a valid 64-character SHA-256 --hash value.");
  }

  if (!["email-verification", "password-reset"].includes(purpose)) {
    throw new Error("--purpose must be email-verification or password-reset.");
  }

  return {
    email,
    hash,
    otp,
    purpose,
  };
}

function hashOtp(purpose: OtpPurpose, email: string, otp: string) {
  return hashToken(`${purpose}:${email.toLowerCase().trim()}:${otp}`);
}

function checkLocalOtpHash() {
  if (env.NODE_ENV === "production") {
    throw new Error("This local OTP hash check script is blocked in production.");
  }

  const options = parseOptions();
  const computedHash = hashOtp(options.purpose, options.email, options.otp);
  const matched = computedHash === options.hash;

  console.log(
    [
      matched ? "MATCH" : "NO MATCH",
      `Email: ${options.email}`,
      `Purpose: ${options.purpose}`,
      `Candidate OTP: ${options.otp}`,
      `Computed hash: ${computedHash}`,
    ].join("\n"),
  );
}

try {
  checkLocalOtpHash();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  printUsage();
  process.exitCode = 1;
}
