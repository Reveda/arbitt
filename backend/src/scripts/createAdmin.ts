import { connectDatabase, disconnectDatabase } from "../config/database";
import { logger } from "../config/logger";
import { generateReferralCode } from "../utils/referralCode";
import { hashPassword } from "../utils/password";
import { ReferralModel } from "../modules/referrals/models/referral.model";
import { UserModel } from "../modules/users/models/user.model";
import { WalletModel } from "../modules/wallet/models/wallet.model";
import { getArg } from "./scriptArgs";

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[a-z0-9_]{3,24}$/;
const allowedCreateRoles = ["admin", "super_admin"] as const;
// npm run admin:create -- --email=test@example.com --password=Admin1234 --username=test_admin

const defaultAdmin = {
  email: "admin@arbitrum.local",
  password: "Admin1234",
  username: "admin",
} as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string) {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

async function buildAvailableUsername(email: string, providedUsername?: string) {
  const requestedUsername = providedUsername ? normalizeUsername(providedUsername) : undefined;

  if (requestedUsername) {
    if (!usernamePattern.test(requestedUsername)) {
      throw new Error(
        "Username must be 3-24 characters and can contain lowercase letters, numbers, and underscore only.",
      );
    }

    const existingUsername = await UserModel.exists({ username: requestedUsername });
    if (existingUsername) {
      throw new Error(`Username is already taken: ${requestedUsername}`);
    }

    return requestedUsername;
  }

  const fallbackBase = normalizeUsername(email.split("@")[0] || "admin");
  const baseUsername = usernamePattern.test(fallbackBase) ? fallbackBase : "admin";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const suffix = attempt === 0 ? "" : `_${attempt}`;
    const candidate = `${baseUsername.slice(0, 24 - suffix.length)}${suffix}`;
    const existingUsername = await UserModel.exists({ username: candidate });

    if (!existingUsername) {
      return candidate;
    }
  }

  throw new Error("Could not generate an available admin username.");
}

async function createAdmin() {
  const email = normalizeEmail(getArg("email") ?? defaultAdmin.email);
  const password = getArg("password") ?? defaultAdmin.password;
  const requestedUsername = getArg("username") ?? defaultAdmin.username;
  const role = getArg("role") ?? "admin";

  if (!emailPattern.test(email)) {
    throw new Error("Enter a valid admin email address.");
  }

  if (!allowedCreateRoles.includes(role as (typeof allowedCreateRoles)[number])) {
    throw new Error("Role must be admin or super_admin.");
  }

  await connectDatabase();

  const existingUser = await UserModel.findOne({ email });

  if (existingUser) {
    existingUser.role = role as (typeof allowedCreateRoles)[number];
    existingUser.status = "active";
    existingUser.emailVerifiedAt = existingUser.emailVerifiedAt ?? new Date();
    existingUser.referralCode = existingUser.referralCode ?? generateReferralCode();
    await existingUser.save();

    await WalletModel.updateOne(
      { userId: existingUser._id },
      { $setOnInsert: { userId: existingUser._id } },
      { upsert: true },
    );
    await ReferralModel.updateOne(
      { userId: existingUser._id },
      { $setOnInsert: { userId: existingUser._id, parentUserId: null, level: 0, path: [] } },
      { upsert: true },
    );

    logger.info(
      { email, role, userId: String(existingUser._id) },
      `Existing user promoted to ${role}`,
    );
    return;
  }

  if (!password) {
    throw new Error("Password is required when creating a new admin. Use --password=StrongPass123");
  }

  if (!passwordPattern.test(password)) {
    throw new Error("Password must be at least 8 characters and include letters and numbers.");
  }

  const username = await buildAvailableUsername(email, requestedUsername);

  const user = await UserModel.create({
    email,
    username,
    passwordHash: await hashPassword(password),
    role,
    status: "active",
    referralCode: generateReferralCode(),
    invitedBy: null,
    emailVerifiedAt: new Date(),
  });

  await Promise.all([
    WalletModel.create({ userId: user._id }),
    ReferralModel.create({ userId: user._id, parentUserId: null, level: 0, path: [] }),
  ]);

  logger.info(
    { email, role, username, userId: String(user._id), referralCode: user.referralCode },
    `${role} user created`,
  );
}

createAdmin()
  .catch((error) => {
    logger.error({ error }, "Admin create script failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
