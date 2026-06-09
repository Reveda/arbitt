import crypto from "node:crypto";

export function generateReferralCode(prefix = "ARB") {
  const token = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}${token}`;
}
