import assert from "node:assert/strict";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { env } from "../config/env";
import { adminService } from "../modules/admin/services/admin.service";
import { TransactionModel } from "../modules/transactions/models/transaction.model";
import { UserModel } from "../modules/users/models/user.model";
import { WalletModel } from "../modules/wallet/models/wallet.model";
import { walletRepository } from "../modules/wallet/repositories/wallet.repository";
import { blockchainService } from "../modules/wallet/services/blockchain.service";
import {
  processWithdrawalJob,
  type WithdrawalJobData,
} from "../modules/wallet/workers/withdrawal.worker";
import { walletService } from "../modules/wallet/services/wallet.service";
import { planService } from "../modules/plans/services/plan.service";
import { UserPlanPurchaseModel } from "../modules/plans/models/user-plan-purchase.model";
import { hashPassword } from "../utils/password";

const testPrefix = `financial_integrity_${Date.now()}`;
const testPassword = "FinancialIntegrity123!";

type Fixture = {
  adminId: string;
  userId: string;
};

async function createFixture(label: string, availableUsdt = 0, lockedUsdt = 0): Promise<Fixture> {
  const passwordHash = await hashPassword(testPassword);
  const admin = await UserModel.create({
    email: `${testPrefix}_${label}_admin@test.invalid`,
    passwordHash,
    role: "admin",
    status: "active",
    username: `${testPrefix}_${label}_admin`,
  });
  const user = await UserModel.create({
    email: `${testPrefix}_${label}_user@test.invalid`,
    passwordHash,
    role: "user",
    status: "active",
    transactionPasswordHash: passwordHash,
    username: `${testPrefix}_${label}_user`,
  });

  await WalletModel.create([
    { availableUsdt: 1000, userId: admin._id },
    { availableUsdt, lockedUsdt, lifetimeDepositsUsdt: 1000, userId: user._id },
  ]);

  return { adminId: String(admin._id), userId: String(user._id) };
}

async function cleanup() {
  const users = await UserModel.find({ username: new RegExp(`^${testPrefix}`) })
    .select("_id")
    .lean();
  const userIds = users.map((user) => user._id);
  if (!userIds.length) return;

  await Promise.all([
    TransactionModel.deleteMany({ userId: { $in: userIds } }),
    UserPlanPurchaseModel.deleteMany({ userId: { $in: userIds } }),
    WalletModel.deleteMany({ userId: { $in: userIds } }),
    UserModel.deleteMany({ _id: { $in: userIds } }),
  ]);
}

async function testWorkerDuplicateClaim() {
  const fixture = await createFixture("worker");
  await WalletModel.updateOne(
    { userId: fixture.userId },
    { $set: { availableUsdt: 900, lockedUsdt: 100 } },
  );
  const transaction = await TransactionModel.create({
    amountUsdt: 90,
    network: "BEP20",
    payoutPrincipalUsdt: 100,
    status: "pending",
    type: "withdrawal",
    userId: fixture.userId,
    walletAddress: "0x0000000000000000000000000000000000000001",
  });

  const originalSend = blockchainService.sendBscUsdt;
  const originalDebit = walletRepository.debitAdminWithdrawal;
  let sendCount = 0;
  blockchainService.sendBscUsdt = async () => {
    sendCount += 1;
    return `0x${"1".repeat(64)}`;
  };
  walletRepository.debitAdminWithdrawal = async (amountUsdt, session) =>
    WalletModel.findOneAndUpdate(
      { userId: fixture.adminId },
      { $inc: { availableUsdt: -amountUsdt, lifetimeWithdrawalsUsdt: amountUsdt } },
      { new: true, ...(session ? { session } : {}) },
    ).lean();

  try {
    const data: WithdrawalJobData = {
      grossAmountUsdt: 100,
      netAmountUsdt: 90,
      toAddress: "0x0000000000000000000000000000000000000001",
      withdrawalId: String(transaction._id),
    };
    await Promise.all([processWithdrawalJob(data), processWithdrawalJob(data)]);

    const [stored, wallet] = await Promise.all([
      TransactionModel.findById(transaction._id).lean(),
      WalletModel.findOne({ userId: fixture.userId }).lean(),
    ]);
    assert.equal(sendCount, 1, "Duplicate worker jobs must broadcast only once.");
    assert.equal(stored?.status, "completed");
    assert.equal(wallet?.lockedUsdt, 0);
    assert.equal(wallet?.lifetimeWithdrawalsUsdt, 100);
  } finally {
    blockchainService.sendBscUsdt = originalSend;
    walletRepository.debitAdminWithdrawal = originalDebit;
  }
}

async function testSynchronousPersistenceFailure() {
  const fixture = await createFixture("sync", 1000, 0);
  const originalRedisEnabled = env.REDIS_ENABLED;
  env.REDIS_ENABLED = false;
  const originalSend = blockchainService.sendBscUsdt;
  const originalComplete = walletRepository.completeWithdrawalAmount;
  blockchainService.sendBscUsdt = async () => `0x${"2".repeat(64)}`;
  walletRepository.completeWithdrawalAmount = async () => {
    throw new Error("Forced post-broadcast persistence failure.");
  };

  try {
    await assert.rejects(
      walletService.createWithdrawalRequest(fixture.userId, {
        amountUsdt: "100",
        network: "BEP20",
        transactionPassword: "FinancialIntegrity123!",
        walletAddress: "0x0000000000000000000000000000000000000001",
      }),
      /Forced post-broadcast persistence failure/,
    );
    const [wallet, withdrawal] = await Promise.all([
      WalletModel.findOne({ userId: fixture.userId }).lean(),
      TransactionModel.findOne({ userId: fixture.userId, type: "withdrawal" })
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    assert.equal(wallet?.availableUsdt, 900);
    assert.equal(wallet?.lockedUsdt, 100);
    assert.equal(withdrawal?.status, "processing");
  } finally {
    env.REDIS_ENABLED = originalRedisEnabled;
    blockchainService.sendBscUsdt = originalSend;
    walletRepository.completeWithdrawalAmount = originalComplete;
  }
}

async function testAdminWithdrawalRollback() {
  const fixture = await createFixture("admin_withdrawal", 900, 100);
  const transaction = await TransactionModel.create({
    amountUsdt: 90,
    network: "BEP20",
    payoutPrincipalUsdt: 100,
    status: "pending",
    type: "withdrawal",
    userId: fixture.userId,
  });
  const originalReserve = walletRepository.getPrimaryAdminAvailableUsdt;
  const originalDebit = walletRepository.debitAdminWithdrawal;
  walletRepository.getPrimaryAdminAvailableUsdt = async () => 1000;
  walletRepository.debitAdminWithdrawal = async () => {
    throw new Error("Forced admin withdrawal ledger failure.");
  };

  try {
    await assert.rejects(
      adminService.reviewWithdrawal({
        action: "approve",
        adminUserId: fixture.adminId,
        transactionId: String(transaction._id),
      }),
      /Forced admin withdrawal ledger failure/,
    );
    const [stored, wallet] = await Promise.all([
      TransactionModel.findById(transaction._id).lean(),
      WalletModel.findOne({ userId: fixture.userId }).lean(),
    ]);
    assert.equal(stored?.status, "pending");
    assert.equal(wallet?.availableUsdt, 900);
    assert.equal(wallet?.lockedUsdt, 100);
  } finally {
    walletRepository.getPrimaryAdminAvailableUsdt = originalReserve;
    walletRepository.debitAdminWithdrawal = originalDebit;
  }
}

async function testPayoutRollback() {
  const fixture = await createFixture("payout", 0, 0);
  const transaction = await TransactionModel.create({
    amountUsdt: 25,
    network: "SYSTEM",
    payoutTier: "FINANCIAL_INTEGRITY_TEST",
    status: "pending",
    type: "reward",
    userId: fixture.userId,
  });
  const originalDebit = walletRepository.debitAdminPayout;
  walletRepository.debitAdminPayout = async () => {
    throw new Error("Forced payout ledger failure.");
  };

  try {
    await assert.rejects(
      adminService.reviewPayout({
        action: "approve",
        adminUserId: fixture.adminId,
        transactionId: String(transaction._id),
      }),
      /Forced payout ledger failure/,
    );
    const [stored, wallet] = await Promise.all([
      TransactionModel.findById(transaction._id).lean(),
      WalletModel.findOne({ userId: fixture.userId }).lean(),
    ]);
    assert.equal(stored?.status, "pending");
    assert.equal(wallet?.availableUsdt, 0);
    assert.equal(wallet?.lifetimeRewardsUsdt, 0);
  } finally {
    walletRepository.debitAdminPayout = originalDebit;
  }
}

async function testPlanPurchaseRollback() {
  const fixture = await createFixture("plan_purchase", 1000, 0);
  const originalCredit = walletRepository.creditAdminPlanPurchase;
  walletRepository.creditAdminPlanPurchase = async () => null;

  try {
    await assert.rejects(
      planService.purchasePlan(fixture.userId, { amountUsdt: "100", tier: "INITIAL" }),
      /Primary admin wallet is unavailable/,
    );
    const [wallet, transaction, purchase] = await Promise.all([
      WalletModel.findOne({ userId: fixture.userId }).lean(),
      TransactionModel.findOne({ userId: fixture.userId, type: "plan_purchase" }).lean(),
      UserPlanPurchaseModel.findOne({ userId: fixture.userId }).lean(),
    ]);
    assert.equal(wallet?.availableUsdt, 1000);
    assert.equal(wallet?.lockedUsdt, 0);
    assert.equal(transaction, null);
    assert.equal(purchase, null);
  } finally {
    walletRepository.creditAdminPlanPurchase = originalCredit;
  }

  const insufficientFixture = await createFixture("plan_insufficient", 0, 0);
  await assert.rejects(
    planService.purchasePlan(insufficientFixture.userId, { amountUsdt: "100", tier: "INITIAL" }),
    /Insufficient top-up wallet balance/,
  );
  const insufficientWallet = await WalletModel.findOne({
    userId: insufficientFixture.userId,
  }).lean();
  assert.equal(insufficientWallet?.availableUsdt, 0);
  assert.equal(insufficientWallet?.lockedUsdt, 0);
}

async function run() {
  if (!env.MONGODB_TRANSACTIONS_ENABLED) {
    throw new Error("MONGODB_TRANSACTIONS_ENABLED must be true for this regression suite.");
  }

  await connectDatabase();
  await cleanup();
  try {
    await testWorkerDuplicateClaim();
    await testSynchronousPersistenceFailure();
    await testAdminWithdrawalRollback();
    await testPayoutRollback();
    await testPlanPurchaseRollback();
    console.log("Financial integrity regression suite passed: bugs 1, 2, 3, 4, and 5.");
  } finally {
    await cleanup();
  }
}

run()
  .catch((error) => {
    console.error("Financial integrity regression suite failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDatabase();
    }
  });
