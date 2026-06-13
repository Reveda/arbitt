import { connectDatabase, disconnectDatabase } from "../config/database";
import { logger } from "../config/logger";
import { UserPlanPurchaseModel } from "../modules/plans/models/user-plan-purchase.model";
import { planRepository } from "../modules/plans/repositories/plan.repository";
import { ReferralModel } from "../modules/referrals/models/referral.model";
import { TransactionModel } from "../modules/transactions/models/transaction.model";
import { UserModel } from "../modules/users/models/user.model";
import { WalletModel } from "../modules/wallet/models/wallet.model";
import { hashPassword } from "../utils/password";
import { generateReferralCode } from "../utils/referralCode";
import { getArg } from "./scriptArgs";

const testPassword = "Test1234";
const testUsers = [
  { email: "test@gmail.com", username: "test123", lifetimeDepositsUsdt: 100 },
  {
    email: "nitesh.initial@payout.test",
    username: "nitesh_initial",
    lifetimeDepositsUsdt: 150,
    parentEmail: "test@gmail.com",
  },
  {
    email: "nitesh.initial_mid@payout.test",
    username: "nitesh_initial_mid",
    lifetimeDepositsUsdt: 500,
  },
  { email: "nitesh.growth@payout.test", username: "nitesh_growth", lifetimeDepositsUsdt: 2500 },
  { email: "nitesh.premium@payout.test", username: "nitesh_premium", lifetimeDepositsUsdt: 6000 },
  { email: "nitesh.apex@payout.test", username: "nitesh_apex", lifetimeDepositsUsdt: 8000 },
  { email: "nitesh.elite@payout.test", username: "nitesh_elite", lifetimeDepositsUsdt: 9500 },
  ...Array.from({ length: 10 }, (_, index) => ({
    email: `test.direct${String(index + 1).padStart(2, "0")}@payout.test`,
    username: `test_direct_${String(index + 1).padStart(2, "0")}`,
    lifetimeDepositsUsdt: 100,
    parentEmail: "test@gmail.com",
  })),
] as const;

function getPayoutWeekStartInputValue() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start.toISOString().slice(0, 10);
}

function getPayoutWeekStart(value: string) {
  const start = new Date(`${value}T00:00:00.000Z`);
  const normalizedStart = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const daysSinceMonday = (normalizedStart.getUTCDay() + 6) % 7;
  normalizedStart.setUTCDate(normalizedStart.getUTCDate() - daysSinceMonday);

  return normalizedStart;
}

function getPeriodEnd(periodStart: Date) {
  const periodEnd = new Date(periodStart);
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 5);
  return periodEnd;
}

function getSeedDepositReviewedAt(periodEnd: Date) {
  const reviewedAt = new Date(periodEnd);
  reviewedAt.setUTCHours(12, 0, 0, 0);
  return reviewedAt;
}

function roundUsdt(value: number) {
  return Math.round(value * 100) / 100;
}

function getReturnAmount(principal: number, percent: number) {
  return roundUsdt((principal * percent) / 100);
}

async function seedPayoutTestData() {
  const weekStart = getArg("weekStart") ?? getPayoutWeekStartInputValue();
  const resetPayouts = getArg("reset-payouts") === "true";
  const periodStart = getPayoutWeekStart(weekStart);
  const periodEnd = getPeriodEnd(periodStart);
  const seedDepositReviewedAt = getSeedDepositReviewedAt(periodEnd);

  await connectDatabase();

  const ruleSet = await planRepository.ensureDefaultRuleSet();
  const activeTiers = [...ruleSet.investmentTiers]
    .filter((tier) => tier.isActive !== false)
    .sort((tierA, tierB) => tierA.minUsdt - tierB.minUsdt);
  const passwordHash = await hashPassword(testPassword);
  const seededUserIds: string[] = [];
  let totalSeededDepositsUsdt = 0;

  for (const testUser of testUsers) {
    totalSeededDepositsUsdt += testUser.lifetimeDepositsUsdt;
    const existingUser = await UserModel.findOne({ email: testUser.email });
    const user =
      existingUser ??
      (await UserModel.create({
        email: testUser.email,
        username: testUser.username,
        passwordHash,
        role: "user",
        status: "active",
        referralCode: generateReferralCode(),
        invitedBy: null,
        emailVerifiedAt: new Date(),
      }));

    if (existingUser) {
      user.username = testUser.username;
      user.role = "user";
      user.status = "active";
      user.referralCode = user.referralCode ?? generateReferralCode();
      user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
      if ("parentEmail" in testUser) {
        const parentUser = await UserModel.findOne({ email: testUser.parentEmail });
        user.invitedBy = parentUser?._id ?? user.invitedBy;
      }
      await user.save();
    }

    seededUserIds.push(String(user._id));
    const parentUser =
      "parentEmail" in testUser ? await UserModel.findOne({ email: testUser.parentEmail }) : null;
    const parentReferral = parentUser
      ? await ReferralModel.findOne({ userId: parentUser._id }).lean()
      : null;
    const referralPath = parentUser
      ? [...(parentReferral?.path?.map((entry) => String(entry)) ?? []), String(parentUser._id)]
      : [];

    if (
      "parentEmail" in testUser &&
      parentUser &&
      String(user.invitedBy) !== String(parentUser._id)
    ) {
      user.invitedBy = parentUser._id;
      await user.save();
    }

    await Promise.all([
      WalletModel.updateOne(
        { userId: user._id },
        {
          $set: {
            availableUsdt: 0,
            lifetimeDepositsUsdt: testUser.lifetimeDepositsUsdt,
            lockedUsdt: testUser.lifetimeDepositsUsdt,
          },
          $setOnInsert: {
            userId: user._id,
            lifetimeRewardsUsdt: 0,
            lifetimeWithdrawalsUsdt: 0,
          },
        },
        { upsert: true },
      ),
      ReferralModel.updateOne(
        { userId: user._id },
        "parentEmail" in testUser
          ? {
              $set: {
                parentUserId: parentUser?._id ?? null,
                level: parentUser ? (parentReferral?.level ?? 0) + 1 : 0,
                path: referralPath,
              },
              $setOnInsert: { userId: user._id },
            }
          : {
              $setOnInsert: { userId: user._id, parentUserId: null, level: 0, path: [] },
            },
        { upsert: true },
      ),
      TransactionModel.updateOne(
        { txnHash: `seed-payout-${testUser.username}` },
        {
          $set: {
            amountUsdt: testUser.lifetimeDepositsUsdt,
            network: "BEP20",
            notes: "Seeded approved deposit for payout testing",
            reviewedAt: seedDepositReviewedAt,
            status: "approved",
            type: "deposit",
            userId: user._id,
          },
          $setOnInsert: {
            txnHash: `seed-payout-${testUser.username}`,
          },
        },
        { upsert: true },
      ),
    ]);

    const tier = activeTiers.find(
      (candidate) =>
        testUser.lifetimeDepositsUsdt >= candidate.minUsdt &&
        testUser.lifetimeDepositsUsdt <= candidate.maxUsdt,
    );

    if (tier) {
      const planPurchaseTransaction = await TransactionModel.findOneAndUpdate(
        { txnHash: `seed-plan-purchase-${testUser.username}` },
        {
          $set: {
            amountUsdt: testUser.lifetimeDepositsUsdt,
            network: "SYSTEM",
            notes: `Seeded ${tier.name} purchase for payout testing`,
            payoutPercent: tier.weeklyReturnMaxPercent,
            payoutPrincipalUsdt: testUser.lifetimeDepositsUsdt,
            payoutTier: tier.tier,
            status: "completed",
            type: "plan_purchase",
            userId: user._id,
          },
          $setOnInsert: {
            txnHash: `seed-plan-purchase-${testUser.username}`,
          },
        },
        { new: true, upsert: true },
      );

      await UserPlanPurchaseModel.updateOne(
        { sourceTransactionId: planPurchaseTransaction._id },
        {
          $set: {
            amountUsdt: testUser.lifetimeDepositsUsdt,
            name: tier.name,
            purchasedAt: seedDepositReviewedAt,
            status: "active",
            tier: tier.tier,
            userId: user._id,
            weeklyReturnPercent: tier.weeklyReturnMaxPercent,
          },
          $setOnInsert: {
            sourceTransactionId: planPurchaseTransaction._id,
          },
        },
        { upsert: true },
      );
    }

    logger.info(
      {
        email: testUser.email,
        loginPassword: testPassword,
        maxReturnUsdt: tier
          ? getReturnAmount(testUser.lifetimeDepositsUsdt, tier.weeklyReturnMaxPercent)
          : null,
        minReturnUsdt: tier
          ? getReturnAmount(testUser.lifetimeDepositsUsdt, tier.weeklyReturnMinPercent)
          : null,
        principalUsdt: testUser.lifetimeDepositsUsdt,
        tier: tier?.tier ?? "No tier",
        username: testUser.username,
      },
      "Seeded payout test user",
    );
  }

  const adminUser = await UserModel.findOne({ role: "admin", status: "active" })
    .sort({ createdAt: 1 })
    .select("_id email username")
    .lean();

  if (adminUser) {
    await WalletModel.updateOne(
      { userId: adminUser._id },
      {
        $set: {
          availableUsdt: totalSeededDepositsUsdt,
          lifetimeDepositsUsdt: totalSeededDepositsUsdt,
          lockedUsdt: 0,
          ...(resetPayouts ? { lifetimeRewardsUsdt: 0 } : {}),
        },
        $setOnInsert: {
          lifetimeWithdrawalsUsdt: 0,
          userId: adminUser._id,
        },
      },
      { setDefaultsOnInsert: true, upsert: true },
    );

    logger.info(
      {
        adminEmail: adminUser.email,
        availableUsdt: totalSeededDepositsUsdt,
        walletRole: "platform-admin",
      },
      "Seeded admin wallet accounting balance",
    );
  } else {
    logger.warn("No active admin user found. Admin wallet accounting balance was not seeded.");
  }

  if (resetPayouts) {
    const result = await TransactionModel.deleteMany({
      payoutKind: "weekly",
      type: "reward",
      userId: { $in: seededUserIds },
    });

    logger.info(
      {
        deletedCount: result.deletedCount,
        periodEnd: periodEnd.toISOString().slice(0, 10),
        periodStart: periodStart.toISOString().slice(0, 10),
      },
      "Reset seeded weekly payouts",
    );
  }

  logger.info(
    {
      resetPayouts,
      searchKeyword: "nit",
      seedDepositReviewedAt: seedDepositReviewedAt.toISOString(),
      weekEnd: periodEnd.toISOString().slice(0, 10),
      weekStart: periodStart.toISOString().slice(0, 10),
    },
    "Payout test data ready",
  );
}

seedPayoutTestData()
  .catch((error) => {
    logger.error({ error }, "Payout test seed script failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
