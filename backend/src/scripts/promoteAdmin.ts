import { connectDatabase, disconnectDatabase } from "../config/database";
import { logger } from "../config/logger";
import { generateReferralCode } from "../utils/referralCode";
import { ReferralModel } from "../modules/referrals/models/referral.model";
import { UserModel } from "../modules/users/models/user.model";
import { WalletModel } from "../modules/wallet/models/wallet.model";
import { getArg, requireArg } from "./scriptArgs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedPromoteRoles = ["admin", "super_admin"] as const;

async function promoteAdmin() {
  const email = requireArg("email").toLowerCase();
  const role = getArg("role") ?? "admin";

  if (!emailPattern.test(email)) {
    throw new Error("Enter a valid user email address.");
  }

  if (!allowedPromoteRoles.includes(role as (typeof allowedPromoteRoles)[number])) {
    throw new Error("Role must be admin or super_admin.");
  }

  await connectDatabase();

  const user = await UserModel.findOne({ email });

  if (!user) {
    throw new Error(`No user found with email: ${email}`);
  }

  user.role = role as (typeof allowedPromoteRoles)[number];
  user.status = "active";
  user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
  user.referralCode = user.referralCode ?? generateReferralCode();
  await user.save();

  await WalletModel.updateOne(
    { userId: user._id },
    { $setOnInsert: { userId: user._id } },
    { upsert: true },
  );
  await ReferralModel.updateOne(
    { userId: user._id },
    { $setOnInsert: { userId: user._id, parentUserId: null, level: 0, path: [] } },
    { upsert: true },
  );

  logger.info(
    { email, userId: String(user._id), referralCode: user.referralCode },
    `User promoted to ${role}`,
  );
}

promoteAdmin()
  .catch((error) => {
    logger.error({ error }, "Admin promote script failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
