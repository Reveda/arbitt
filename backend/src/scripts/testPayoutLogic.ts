import assert from "node:assert/strict";
import { Types } from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { logger } from "../config/logger";
import { adminRepository } from "../modules/admin/repositories/admin.repository";
import { adminService } from "../modules/admin/services/admin.service";
import { AuditLogModel } from "../modules/admin/models/audit-log.model";
import { UserPlanPurchaseModel } from "../modules/plans/models/user-plan-purchase.model";
import { ReferralModel } from "../modules/referrals/models/referral.model";
import { rewardService } from "../modules/rewards/services/reward.service";
import { TransactionModel } from "../modules/transactions/models/transaction.model";
import { UserModel } from "../modules/users/models/user.model";
import { walletService } from "../modules/wallet/services/wallet.service";
import { WalletModel } from "../modules/wallet/models/wallet.model";
import { hashPassword } from "../utils/password";
import { generateReferralCode } from "../utils/referralCode";

const testPassword = "Test1234";
const testDomain = "@logic.test";

type TestUserInput = {
  email: string;
  username: string;
  lifetimeDepositsUsdt: number;
  parentEmail?: string;
};

function roundUsdt(value: number) {
  return Math.round(value * 100) / 100;
}

function getTestUsers(): TestUserInput[] {
  return [
    { email: `sponsor${testDomain}`, username: "logic_sponsor", lifetimeDepositsUsdt: 1000 },
    {
      email: `child${testDomain}`,
      username: "logic_child",
      lifetimeDepositsUsdt: 100,
      parentEmail: `sponsor${testDomain}`,
    },
    {
      email: `grandchild${testDomain}`,
      username: "logic_grandchild",
      lifetimeDepositsUsdt: 100,
      parentEmail: `child${testDomain}`,
    },
    {
      email: `withdraw_user${testDomain}`,
      username: "logic_withdraw_user",
      lifetimeDepositsUsdt: 1000,
    },
    ...Array.from({ length: 9 }, (_, index) => ({
      email: `direct${String(index + 1).padStart(2, "0")}${testDomain}`,
      username: `logic_direct_${String(index + 1).padStart(2, "0")}`,
      lifetimeDepositsUsdt: 100,
      parentEmail: `sponsor${testDomain}`,
    })),
  ];
}

async function cleanupTestData() {
  const users = await UserModel.find({ email: new RegExp(`${testDomain.replace(".", "\\.")}$`) })
    .select("_id")
    .lean();
  const userIds = users.map((user) => user._id);

  if (!userIds.length) {
    return;
  }

  await Promise.all([
    AuditLogModel.deleteMany({ actorUserId: { $in: userIds } }),
    TransactionModel.deleteMany({
      $or: [{ userId: { $in: userIds } }, { payoutSourceUserId: { $in: userIds } }],
    }),
    UserPlanPurchaseModel.deleteMany({ userId: { $in: userIds } }),
    WalletModel.deleteMany({ userId: { $in: userIds } }),
    ReferralModel.deleteMany({
      $or: [{ userId: { $in: userIds } }, { parentUserId: { $in: userIds } }],
    }),
    UserModel.deleteMany({ _id: { $in: userIds } }),
  ]);
}

async function createTestUser(input: TestUserInput, passwordHash: string) {
  const parentUser = input.parentEmail
    ? await UserModel.findOne({ email: input.parentEmail })
    : null;
  const parentReferral = parentUser
    ? await ReferralModel.findOne({ userId: parentUser._id }).lean()
    : null;
  const path = parentUser
    ? [...(parentReferral?.path?.map((entry) => String(entry)) ?? []), String(parentUser._id)]
    : [];
  const user = await UserModel.create({
    email: input.email,
    emailVerifiedAt: new Date(),
    invitedBy: parentUser?._id ?? null,
    passwordHash,
    referralCode: generateReferralCode("TST"),
    role: "user",
    status: "active",
    username: input.username,
  });

  await Promise.all([
    WalletModel.create({
      availableUsdt: 0,
      lifetimeDepositsUsdt: input.lifetimeDepositsUsdt,
      lockedUsdt: input.lifetimeDepositsUsdt,
      userId: user._id,
    }),
    ReferralModel.create({
      level: parentUser ? (parentReferral?.level ?? 0) + 1 : 0,
      parentUserId: parentUser?._id ?? null,
      path,
      userId: user._id,
    }),
  ]);
  const sourceTransaction = await TransactionModel.create({
    amountUsdt: input.lifetimeDepositsUsdt,
    network: "SYSTEM",
    notes: "Logic test plan purchase",
    payoutPercent: 2,
    payoutPrincipalUsdt: input.lifetimeDepositsUsdt,
    payoutTier: "INITIAL",
    status: "completed",
    type: "plan_purchase",
    userId: user._id,
  });

  await UserPlanPurchaseModel.create({
    amountUsdt: input.lifetimeDepositsUsdt,
    name: "Initial Pool",
    purchasedAt: new Date("2026-05-01T00:00:00.000Z"),
    sourceTransactionId: sourceTransaction._id,
    tier: "INITIAL",
    userId: user._id,
    weeklyReturnPercent: 2,
  });

  return user;
}

async function assertSundayPurchaseMovesToNextWeek(userId: string) {
  await UserPlanPurchaseModel.deleteMany({ userId });
  const purchases = await TransactionModel.create([
    {
      amountUsdt: 100,
      network: "SYSTEM",
      notes: "Logic test Friday plan purchase",
      status: "completed",
      type: "plan_purchase",
      userId,
    },
    {
      amountUsdt: 100,
      network: "SYSTEM",
      notes: "Logic test Sunday plan purchase",
      status: "completed",
      type: "plan_purchase",
      userId,
    },
  ]);
  await UserPlanPurchaseModel.create([
    {
      amountUsdt: 100,
      name: "Initial Pool",
      purchasedAt: new Date("2026-05-22T10:00:00.000Z"),
      sourceTransactionId: purchases[0]._id,
      tier: "INITIAL",
      userId,
      weeklyReturnPercent: 2,
    },
    {
      amountUsdt: 100,
      name: "Initial Pool",
      purchasedAt: new Date("2026-05-24T10:00:00.000Z"),
      sourceTransactionId: purchases[1]._id,
      tier: "INITIAL",
      userId,
      weeklyReturnPercent: 2,
    },
  ]);

  const currentWeekWallets = await adminRepository.listPayoutEligibleWallets({
    eligibleUntil: new Date("2026-05-23T23:59:59.999Z"),
    minimumPrincipalUsdt: 100,
  });
  const nextWeekWallets = await adminRepository.listPayoutEligibleWallets({
    eligibleUntil: new Date("2026-05-30T23:59:59.999Z"),
    minimumPrincipalUsdt: 100,
  });
  const currentWeekUser = currentWeekWallets.find((wallet) => String(wallet.userId) === userId);
  const nextWeekUser = nextWeekWallets.find((wallet) => String(wallet.userId) === userId);

  assert.equal(
    currentWeekUser?.lifetimeDepositsUsdt,
    100,
    "Sunday plan purchase should not count in the previous payout week.",
  );
  assert.equal(
    nextWeekUser?.lifetimeDepositsUsdt,
    200,
    "Sunday plan purchase should count from the next payout week.",
  );
}

function toObjectId(value: unknown) {
  return new Types.ObjectId(String(value));
}

async function setupM1Structure(parentUserId: string, directsStartIndex: number) {
  const directs: any[] = [];
  for (let i = 0; i < 10; i++) {
    const email = `subdirect_${directsStartIndex + i}${testDomain}`;
    const user = await UserModel.create({
      email,
      emailVerifiedAt: new Date(),
      invitedBy: toObjectId(parentUserId),
      passwordHash: "dummy",
      referralCode: generateReferralCode("TST"),
      role: "user",
      status: "active",
      username: `subdirect_${directsStartIndex + i}`,
    });

    const parentReferral = await ReferralModel.findOne({ userId: parentUserId }).lean();
    const path = [
      ...(parentReferral?.path?.map((entry) => String(entry)) ?? []),
      String(parentUserId),
    ];

    await Promise.all([
      WalletModel.create({
        availableUsdt: 0,
        lifetimeDepositsUsdt: i < 2 ? 25000 : 100,
        lockedUsdt: i < 2 ? 25000 : 100,
        userId: user._id,
      }),
      ReferralModel.create({
        level: (parentReferral?.level ?? 0) + 1,
        parentUserId: toObjectId(parentUserId),
        path,
        userId: user._id,
      }),
    ]);

    directs.push(user);
  }

  for (let i = 0; i < 10; i++) {
    const amount = i < 2 ? 25000 : 100;
    const tier = i < 2 ? "ELITE" : "INITIAL";
    const name = i < 2 ? "Elite Pool" : "Initial Pool";
    const sourceTransaction = await TransactionModel.create({
      amountUsdt: amount,
      network: "SYSTEM",
      notes: "Dummy plan purchase for M1 setup",
      payoutPercent: i < 2 ? 7 : 2,
      payoutPrincipalUsdt: amount,
      payoutTier: tier,
      status: "completed",
      type: "plan_purchase",
      userId: directs[i]._id,
    });

    await UserPlanPurchaseModel.create({
      amountUsdt: amount,
      name,
      sourceTransactionId: sourceTransaction._id,
      tier,
      userId: directs[i]._id,
      weeklyReturnPercent: i < 2 ? 7 : 2,
    });
  }
}

async function assertWeeklyPayoutStopsAtThreeTimesPrincipal(userId: string, adminUserId: string) {
  await Promise.all([
    TransactionModel.deleteMany({ type: "reward", userId }),
    UserPlanPurchaseModel.deleteMany({ userId }),
    WalletModel.updateOne({ userId }, { $set: { lifetimeDepositsUsdt: 700, lockedUsdt: 700 } }),
  ]);
  const sourceTransaction = await TransactionModel.create({
    amountUsdt: 700,
    network: "SYSTEM",
    notes: "Logic test capped plan purchase",
    payoutPercent: 2,
    payoutPrincipalUsdt: 700,
    payoutTier: "INITIAL",
    status: "completed",
    type: "plan_purchase",
    userId,
  });
  await UserPlanPurchaseModel.create({
    amountUsdt: 700,
    name: "Initial Pool",
    purchasedAt: new Date("2026-05-11T00:00:00.000Z"),
    sourceTransactionId: sourceTransaction._id,
    tier: "INITIAL",
    userId,
    weeklyReturnPercent: 2,
  });
  await TransactionModel.create({
    amountUsdt: 2099,
    network: "SYSTEM",
    notes: "Logic test already approved level earnings",
    payoutKind: "level",
    payoutPercent: 2,
    payoutPeriodEnd: new Date("2026-05-16T00:00:00.000Z"),
    payoutPeriodStart: new Date("2026-05-11T00:00:00.000Z"),
    payoutPrincipalUsdt: 700,
    payoutTier: "INITIAL",
    status: "approved",
    type: "reward",
    userId,
  });

  await adminService.generateWeeklyPayouts({
    adminUserId,
    payoutType: "roi",
    weekStart: "2026-05-22",
    autoApprove: false,
  });
  const cappedPayout = await TransactionModel.findOne({
    payoutKind: "weekly",
    payoutPeriodStart: new Date("2026-05-16T00:00:00.000Z"),
    userId,
  }).lean();
  assert.ok(cappedPayout, "Capped weekly payout should be generated.");
  assert.equal(
    cappedPayout.amountUsdt,
    1,
    "Weekly payout should be capped at the remaining 3x earning capacity.",
  );

  await adminService.reviewPayout({
    action: "approve",
    adminUserId,
    transactionId: String(cappedPayout?._id),
  });
  const excessivePayout = await TransactionModel.create({
    amountUsdt: 1,
    network: "SYSTEM",
    notes: "Logic test over-cap weekly payout",
    payoutKind: "weekly",
    payoutPercent: 2,
    payoutPeriodEnd: new Date("2026-05-30T00:00:00.000Z"),
    payoutPeriodStart: new Date("2026-05-25T00:00:00.000Z"),
    payoutPrincipalUsdt: 700,
    payoutTier: "INITIAL",
    status: "pending",
    type: "reward",
    userId,
  });

  await assert.rejects(
    () =>
      adminService.reviewPayout({
        action: "approve",
        adminUserId,
        transactionId: String(excessivePayout._id),
      }),
    /exceeds 3x total earning cap/,
    "Admin should not approve payout above the 3x total earning cap.",
  );
}

async function getActivePrincipalUsdt(userId: string) {
  const plans = await UserPlanPurchaseModel.find({ status: "active", userId }).lean();

  return roundUsdt(plans.reduce((total, plan) => total + (plan.amountUsdt ?? 0), 0));
}

async function assertTotalRewardCapIncludesLevelAndRoyalty(input: {
  adminUserId: string;
  childUserId: string;
  sourceUserId: string;
  sponsorUserId: string;
}) {
  const childCapUsdt = roundUsdt((await getActivePrincipalUsdt(input.childUserId)) * 3);

  await TransactionModel.deleteMany({ type: "reward", userId: input.childUserId });
  await TransactionModel.create({
    amountUsdt: roundUsdt(childCapUsdt - 5),
    network: "SYSTEM",
    notes: "Logic test approved rewards before capped level income",
    payoutKind: "weekly",
    status: "approved",
    type: "reward",
    userId: input.childUserId,
  });

  const sourceTransaction = await TransactionModel.create({
    amountUsdt: 100,
    network: "SYSTEM",
    notes: "Logic test source purchase for capped level income",
    status: "completed",
    type: "plan_purchase",
    userId: input.sourceUserId,
  });

  await rewardService.createLevelIncomeRewardsForPlanPurchase({
    amountUsdt: 100,
    transactionId: String(sourceTransaction._id),
    userId: input.sourceUserId,
  });

  const cappedLevelReward = await TransactionModel.findOne({
    payoutKind: "level",
    payoutLevel: 1,
    payoutSourceTransactionId: sourceTransaction._id,
    userId: input.childUserId,
  }).lean();

  assert.equal(cappedLevelReward?.amountUsdt, 5, "Level income should count inside the 3x cap.");

  await adminService.reviewPayout({
    action: "approve",
    adminUserId: input.adminUserId,
    transactionId: String(cappedLevelReward?._id),
  });

  const excessiveLevelReward = await TransactionModel.create({
    amountUsdt: 1,
    network: "SYSTEM",
    notes: "Logic test over-cap level income",
    payoutKind: "level",
    payoutLevel: 1,
    payoutPrincipalUsdt: 100,
    payoutTier: "L1",
    status: "pending",
    type: "reward",
    userId: input.childUserId,
  });

  await assert.rejects(
    () =>
      adminService.reviewPayout({
        action: "approve",
        adminUserId: input.adminUserId,
        transactionId: String(excessiveLevelReward._id),
      }),
    /exceeds 3x total earning cap/,
    "Admin should not approve level income above the 3x total earning cap.",
  );

  const sponsorCapUsdt = roundUsdt((await getActivePrincipalUsdt(input.sponsorUserId)) * 3);
  const cappedRoyaltyPeriodStart = new Date(Date.UTC(2026, 3, 1));
  const cappedRoyaltyPeriodEnd = new Date(Date.UTC(2026, 3, 30, 23, 59, 59, 999));

  await TransactionModel.deleteMany({ type: "reward", userId: input.sponsorUserId });
  await TransactionModel.create({
    amountUsdt: roundUsdt(sponsorCapUsdt - 20),
    network: "SYSTEM",
    notes: "Logic test approved rewards before capped royalty income",
    payoutKind: "weekly",
    status: "approved",
    type: "reward",
    userId: input.sponsorUserId,
  });

  // Qualify sponsor for M1 by setting child and direct01 to 25k USDT each (50k capped volume)
  await UserPlanPurchaseModel.updateOne(
    { userId: input.childUserId },
    { $set: { amountUsdt: 25000, name: "Elite Pool", tier: "ELITE", weeklyReturnPercent: 7 } },
  );
  const direct01 = await UserModel.findOne({ email: `direct01${testDomain}` });
  await UserPlanPurchaseModel.updateOne(
    { userId: direct01?._id },
    { $set: { amountUsdt: 25000, name: "Elite Pool", tier: "ELITE", weeklyReturnPercent: 7 } },
  );

  await rewardService.generateSalaryRoyaltyRewards({
    periodEnd: cappedRoyaltyPeriodEnd,
    periodStart: cappedRoyaltyPeriodStart,
    userIds: [input.sponsorUserId],
  });

  const cappedRoyaltyReward = await TransactionModel.findOne({
    payoutKind: "salary_royalty",
    payoutPeriodEnd: cappedRoyaltyPeriodEnd,
    payoutPeriodStart: cappedRoyaltyPeriodStart,
    userId: input.sponsorUserId,
  }).lean();

  assert.equal(
    cappedRoyaltyReward?.amountUsdt,
    20,
    "Salary royalty income should count inside the 3x cap.",
  );
}

async function assertWithdrawalChargeFlow(input: { adminUserId: string; userId: string }) {
  await Promise.all([
    TransactionModel.deleteMany({ type: "withdrawal", userId: input.userId }),
    UserPlanPurchaseModel.deleteMany({ userId: input.userId }),
    WalletModel.updateOne(
      { userId: input.userId },
      {
        $set: {
          availableUsdt: 1000,
          lifetimeDepositsUsdt: 1000,
          lifetimeWithdrawalsUsdt: 0,
          lockedUsdt: 0,
        },
      },
    ),
  ]);

  const withdrawal = await walletService.createWithdrawalRequest(input.userId, {
    amountUsdt: 100,
    network: "BEP20",
  });

  assert.equal(withdrawal.grossAmountUsdt, 100, "Withdrawal gross amount should be locked.");
  assert.equal(withdrawal.chargeUsdt, 10, "Withdrawal charge should be 10%.");
  assert.equal(withdrawal.netAmountUsdt, 90, "Withdrawal net payout should be after 10% charge.");
  assert.equal(withdrawal.amountUsdt, 90, "Withdrawal transaction amount should be net payout.");
  assert.equal(
    withdrawal.wallet.availableUsdt,
    900,
    "Withdrawal request should reduce available balance.",
  );
  assert.equal(withdrawal.wallet.lockedUsdt, 100, "Withdrawal request should lock gross amount.");

  const pendingWithdrawal = await TransactionModel.findById(withdrawal.id).lean();

  assert.equal(
    pendingWithdrawal?.payoutPrincipalUsdt,
    100,
    "Gross amount should be stored on withdrawal.",
  );
  assert.equal(pendingWithdrawal?.payoutPercent, 10, "Withdrawal fee percent should be stored.");

  await adminService.reviewWithdrawal({
    action: "approve",
    adminUserId: input.adminUserId,
    transactionId: withdrawal.id,
  });

  const approvedWallet = await WalletModel.findOne({ userId: input.userId }).lean();

  assert.equal(
    approvedWallet?.availableUsdt,
    900,
    "Approved withdrawal should keep available balance debited.",
  );
  assert.equal(
    approvedWallet?.lockedUsdt,
    0,
    "Approved withdrawal should release locked gross amount.",
  );
  assert.equal(
    approvedWallet?.lifetimeWithdrawalsUsdt,
    100,
    "Approved withdrawal should count gross amount as lifetime withdrawn.",
  );

  const rejectedWithdrawal = await walletService.createWithdrawalRequest(input.userId, {
    amountUsdt: 50,
    network: "BEP20",
  });

  await adminService.reviewWithdrawal({
    action: "reject",
    adminUserId: input.adminUserId,
    transactionId: rejectedWithdrawal.id,
  });

  const rejectedWallet = await WalletModel.findOne({ userId: input.userId }).lean();

  assert.equal(
    rejectedWallet?.availableUsdt,
    900,
    "Rejected withdrawal should unlock gross amount.",
  );
  assert.equal(
    rejectedWallet?.lockedUsdt,
    0,
    "Rejected withdrawal should leave no withdrawal lock.",
  );
  assert.equal(
    rejectedWallet?.lifetimeWithdrawalsUsdt,
    100,
    "Rejected withdrawal should not increase lifetime withdrawals.",
  );
}

async function assertRoyaltyWeeklyCutoff(
  sponsorUserId: string,
  childUserId: string,
  direct01UserId: string,
  adminUserId: string,
) {
  // 1. Clean up existing rewards and purchases for these users to isolate our test
  await Promise.all([
    TransactionModel.deleteMany({ userId: { $in: [sponsorUserId, childUserId, direct01UserId] } }),
    UserPlanPurchaseModel.deleteMany({
      userId: { $in: [sponsorUserId, childUserId, direct01UserId] },
    }),
  ]);

  // Give sponsor a dummy purchase to be active
  await UserPlanPurchaseModel.create({
    amountUsdt: 1000,
    name: "Initial Pool",
    purchasedAt: new Date("2026-05-01T00:00:00.000Z"),
    sourceTransactionId: new Types.ObjectId(),
    tier: "INITIAL",
    userId: sponsorUserId,
    weeklyReturnPercent: 2,
  });
  await WalletModel.updateOne(
    { userId: sponsorUserId },
    { $set: { availableUsdt: 1000, lifetimeDepositsUsdt: 1000, lockedUsdt: 0 } },
  );

  // CASE 1: Plan purchased THIS WEEK (i.e. after last Friday 13:00 UTC)
  // Let's say payout date is Friday, 2026-05-22.
  // Last Friday was 2026-05-15.
  // We purchase plans on Monday, 2026-05-18.
  await UserPlanPurchaseModel.create([
    {
      amountUsdt: 25000,
      name: "Elite Pool",
      purchasedAt: new Date("2026-05-18T10:00:00.000Z"), // Monday (after Friday 15th May 13:00 UTC)
      sourceTransactionId: new Types.ObjectId(),
      tier: "ELITE",
      userId: childUserId,
      weeklyReturnPercent: 7,
    },
    {
      amountUsdt: 25000,
      name: "Elite Pool",
      purchasedAt: new Date("2026-05-18T10:00:00.000Z"), // Monday
      sourceTransactionId: new Types.ObjectId(),
      tier: "ELITE",
      userId: direct01UserId,
      weeklyReturnPercent: 7,
    },
  ]);

  // Generate payouts for Friday May 22
  await adminService.generateWeeklyPayouts({
    adminUserId,
    payoutType: "royalty",
    weekStart: "2026-05-22",
    autoApprove: false,
  });

  const royaltyRewardThisWeek = await TransactionModel.findOne({
    payoutKind: "salary_royalty",
    userId: sponsorUserId,
  }).lean();

  assert.ok(
    royaltyRewardThisWeek,
    "Sponsor should receive royalty payout this week because we removed the cutoff delay logic.",
  );

  // Clean up transactions from the generation to run CASE 2
  await TransactionModel.deleteMany({
    userId: { $in: [sponsorUserId, childUserId, direct01UserId] },
  });
  await UserPlanPurchaseModel.deleteMany({ userId: { $in: [childUserId, direct01UserId] } });

  // CASE 2: Plan purchased BEFORE last Friday's cutoff (e.g. Thursday 2026-05-14)
  await UserPlanPurchaseModel.create([
    {
      amountUsdt: 25000,
      name: "Elite Pool",
      purchasedAt: new Date("2026-05-14T10:00:00.000Z"), // Thursday (before Friday 15th May 13:00 UTC)
      sourceTransactionId: new Types.ObjectId(),
      tier: "ELITE",
      userId: childUserId,
      weeklyReturnPercent: 7,
    },
    {
      amountUsdt: 25000,
      name: "Elite Pool",
      purchasedAt: new Date("2026-05-14T10:00:00.000Z"), // Thursday
      sourceTransactionId: new Types.ObjectId(),
      tier: "ELITE",
      userId: direct01UserId,
      weeklyReturnPercent: 7,
    },
  ]);

  // Generate payouts for Friday May 22
  await adminService.generateWeeklyPayouts({
    adminUserId,
    payoutType: "royalty",
    weekStart: "2026-05-22",
    autoApprove: false,
  });

  const royaltyRewardEligible = await TransactionModel.findOne({
    payoutKind: "salary_royalty",
    userId: sponsorUserId,
  }).lean();

  assert.ok(
    royaltyRewardEligible,
    "Sponsor should receive royalty payout this week because plans were purchased before the last Friday cutoff.",
  );
  assert.equal(royaltyRewardEligible.payoutTier, "M1", "Royalty should be at M1 tier.");
}

async function runPayoutLogicTest() {
  await connectDatabase();
  await cleanupTestData();

  const passwordHash = await hashPassword(testPassword);

  let adminUser = await UserModel.findOne({ role: "admin", status: "active" });
  if (!adminUser) {
    adminUser = await UserModel.create({
      email: "admin@logic.test",
      username: "admin_logic_test",
      passwordHash,
      role: "admin",
      status: "active",
      referralCode: "ADMINTST",
      invitedBy: null,
      emailVerifiedAt: new Date(),
    });
  }
  await WalletModel.updateOne(
    { userId: adminUser._id },
    {
      $set: {
        availableUsdt: 1000000,
        lifetimeDepositsUsdt: 1000000,
        lockedUsdt: 0,
      },
      $setOnInsert: {
        userId: adminUser._id,
        lifetimeRewardsUsdt: 0,
        lifetimeWithdrawalsUsdt: 0,
      },
    },
    { upsert: true },
  );

  const usersByEmail = new Map<string, Awaited<ReturnType<typeof createTestUser>>>();

  for (const testUser of getTestUsers()) {
    const user = await createTestUser(testUser, passwordHash);
    usersByEmail.set(testUser.email, user);
  }

  const sponsor = usersByEmail.get(`sponsor${testDomain}`);
  const child = usersByEmail.get(`child${testDomain}`);
  const grandchild = usersByEmail.get(`grandchild${testDomain}`);
  const withdrawUser = usersByEmail.get(`withdraw_user${testDomain}`);

  assert.ok(sponsor, "Sponsor test user was not created.");
  assert.ok(child, "Child test user was not created.");
  assert.ok(grandchild, "Grandchild test user was not created.");
  assert.ok(withdrawUser, "Withdraw test user was not created.");

  await assertSundayPurchaseMovesToNextWeek(String(child._id));

  const sourcePurchase = await TransactionModel.create({
    amountUsdt: 100,
    network: "SYSTEM",
    notes: "Logic test plan purchase",
    status: "completed",
    type: "plan_purchase",
    userId: grandchild._id,
  });
  const levelRewards = await rewardService.createLevelIncomeRewardsForPlanPurchase({
    amountUsdt: 100,
    transactionId: String(sourcePurchase._id),
    userId: String(grandchild._id),
  });

  assert.equal(levelRewards.length, 2, "Grandchild plan purchase should create L1 and L2 rewards.");

  const childLevelReward = await TransactionModel.findOne({
    payoutKind: "level",
    payoutLevel: 1,
    userId: child._id,
  }).lean();
  const sponsorLevelReward = await TransactionModel.findOne({
    payoutKind: "level",
    payoutLevel: 2,
    userId: sponsor._id,
  }).lean();

  assert.equal(childLevelReward?.amountUsdt, 5, "L1 level income should be 5 USDT.");
  assert.equal(sponsorLevelReward?.amountUsdt, 2, "L2 level income should be 2 USDT.");

  const royaltyPeriodStart = new Date(Date.UTC(2026, 0, 1));
  const royaltyPeriodEnd = new Date(Date.UTC(2026, 0, 31, 23, 59, 59, 999));
  const mismatchRoyaltyPeriodStart = new Date(Date.UTC(2026, 1, 1));
  const mismatchRoyaltyPeriodEnd = new Date(Date.UTC(2026, 1, 28, 23, 59, 59, 999));
  const nextRoyaltyPeriodStart = new Date(Date.UTC(2026, 2, 1));
  const nextRoyaltyPeriodEnd = new Date(Date.UTC(2026, 2, 31, 23, 59, 59, 999));

  // Qualify sponsor for M1 in January by setting child and direct01 to 25k USDT each (50k capped volume)
  await UserPlanPurchaseModel.updateOne(
    { userId: child._id },
    { $set: { amountUsdt: 25000, name: "Elite Pool", tier: "ELITE", weeklyReturnPercent: 7 } },
  );
  const d01 = usersByEmail.get(`direct01${testDomain}`);
  await UserPlanPurchaseModel.updateOne(
    { userId: d01?._id },
    { $set: { amountUsdt: 25000, name: "Elite Pool", tier: "ELITE", weeklyReturnPercent: 7 } },
  );

  const salaryRewards = await rewardService.generateSalaryRoyaltyRewards({
    periodEnd: royaltyPeriodEnd,
    periodStart: royaltyPeriodStart,
    userIds: [String(sponsor._id)],
  });
  const sponsorSalaryReward = await TransactionModel.findOne({
    payoutKind: "salary_royalty",
    payoutPeriodEnd: royaltyPeriodEnd,
    payoutPeriodStart: royaltyPeriodStart,
    payoutTier: "M1",
    userId: sponsor._id,
  }).lean();
  const duplicateSalaryRewards = await rewardService.generateSalaryRoyaltyRewards({
    periodEnd: royaltyPeriodEnd,
    periodStart: royaltyPeriodStart,
    userIds: [String(sponsor._id)],
  });

  // To test mismatch/non-qualification in February, set child and direct01 purchases back to 100 USDT (team business drops < 50k)
  await UserPlanPurchaseModel.updateMany(
    { userId: { $in: [child._id, d01?._id] } },
    { $set: { amountUsdt: 100, name: "Initial Pool", tier: "INITIAL", weeklyReturnPercent: 2 } },
  );

  const mismatchSalaryRewards = await rewardService.generateSalaryRoyaltyRewards({
    periodEnd: mismatchRoyaltyPeriodEnd,
    periodStart: mismatchRoyaltyPeriodStart,
    userIds: [String(sponsor._id)],
  });
  const mismatchM1SalaryReward = await TransactionModel.findOne({
    payoutKind: "salary_royalty",
    payoutPeriodEnd: mismatchRoyaltyPeriodEnd,
    payoutPeriodStart: mismatchRoyaltyPeriodStart,
    payoutTier: "M1",
    userId: sponsor._id,
  }).lean();

  // Restore child and direct01 purchases to 25k USDT, and build M1 structures under child and direct01 to qualify sponsor for M2 in March
  await UserPlanPurchaseModel.updateMany(
    { userId: { $in: [child._id, d01?._id] } },
    { $set: { amountUsdt: 25000, name: "Elite Pool", tier: "ELITE", weeklyReturnPercent: 7 } },
  );
  await setupM1Structure(String(child._id), 100);
  await setupM1Structure(String(d01?._id), 200);

  const nextMonthSalaryRewards = await rewardService.generateSalaryRoyaltyRewards({
    periodEnd: nextRoyaltyPeriodEnd,
    periodStart: nextRoyaltyPeriodStart,
    userIds: [String(sponsor._id)],
  });
  const nextMonthM1SalaryReward = await TransactionModel.findOne({
    payoutKind: "salary_royalty",
    payoutPeriodEnd: nextRoyaltyPeriodEnd,
    payoutPeriodStart: nextRoyaltyPeriodStart,
    payoutTier: "M1",
    userId: sponsor._id,
  }).lean();
  const nextMonthM2SalaryReward = await TransactionModel.findOne({
    payoutKind: "salary_royalty",
    payoutPeriodEnd: nextRoyaltyPeriodEnd,
    payoutPeriodStart: nextRoyaltyPeriodStart,
    payoutTier: "M2",
    userId: sponsor._id,
  }).lean();

  assert.equal(salaryRewards.length, 1, "Sponsor should receive one M1 royalty reward.");
  assert.equal(
    sponsorSalaryReward?.amountUsdt,
    1550,
    "M1 royalty bonus should be 1550 USDT (50 * 31 days).",
  );
  assert.equal(
    duplicateSalaryRewards.length,
    0,
    "Sponsor should not receive duplicate M1 royalty in the same month.",
  );
  assert.equal(
    mismatchSalaryRewards.length,
    0,
    "Sub-threshold team business should not create M1 royalty.",
  );
  assert.equal(mismatchM1SalaryReward, null, "M2 direct members should not create M1 royalty.");
  assert.equal(
    nextMonthSalaryRewards.length,
    1,
    "Sponsor should receive one highest qualified royalty reward in the next month.",
  );
  assert.equal(
    nextMonthM1SalaryReward,
    null,
    "Sponsor should not receive lower M1 when M2 qualifies.",
  );
  assert.equal(
    nextMonthM2SalaryReward?.amountUsdt,
    1448,
    "M2 royalty bonus should be capped to the sponsor's remaining 3x earning capacity.",
  );
  await assertWithdrawalChargeFlow({
    adminUserId: String(sponsor._id),
    userId: String(withdrawUser._id),
  });
  await assertTotalRewardCapIncludesLevelAndRoyalty({
    adminUserId: String(sponsor._id),
    childUserId: String(child._id),
    sourceUserId: String(grandchild._id),
    sponsorUserId: String(sponsor._id),
  });
  await assertRoyaltyWeeklyCutoff(
    String(sponsor._id),
    String(child._id),
    String(d01?._id),
    String(adminUser._id),
  );
  await assertWeeklyPayoutStopsAtThreeTimesPrincipal(String(grandchild._id), String(sponsor._id));

  logger.info(
    {
      levelRewards: levelRewards.length,
      salaryRewards: salaryRewards.length,
      totalThreeTimesCap: "passed",
      sponsorEmail: sponsor.email,
      sundayCutoff: "passed",
    },
    "Payout logic test passed",
  );
}

runPayoutLogicTest()
  .catch((error) => {
    console.error(error);
    logger.error(
      { error: error instanceof Error ? error.stack : error },
      "Payout logic test failed",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanupTestData();
    await disconnectDatabase();
  });
