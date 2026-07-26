import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { env } from "../config/env";
import { adminService } from "../modules/admin/services/admin.service";
import { TransactionModel } from "../modules/transactions/models/transaction.model";
import { UserModel } from "../modules/users/models/user.model";
import { WalletModel } from "../modules/wallet/models/wallet.model";
import { walletRepository } from "../modules/wallet/repositories/wallet.repository";
import { hashPassword } from "../utils/password";

const testDomain = "@payout-atomicity.test";

async function cleanup() {
  const users = await UserModel.find({ email: new RegExp(`${testDomain.replace(".", "\\.")}$`) })
    .select("_id")
    .lean();
  const userIds = users.map((user) => user._id);

  if (!userIds.length) return;

  await Promise.all([
    TransactionModel.deleteMany({ userId: { $in: userIds } }),
    WalletModel.deleteMany({ userId: { $in: userIds } }),
    UserModel.deleteMany({ _id: { $in: userIds } }),
  ]);
}

async function run() {
  if (!env.MONGODB_TRANSACTIONS_ENABLED) {
    throw new Error("MONGODB_TRANSACTIONS_ENABLED must be true for this regression test.");
  }

  await connectDatabase();
  await cleanup();

  const passwordHash = await hashPassword("AtomicityTest123!");
  const [admin, recipient] = await UserModel.create([
    {
      email: `admin${testDomain}`,
      passwordHash,
      role: "admin",
      status: "active",
      username: "payout_atomicity_admin",
    },
    {
      email: `recipient${testDomain}`,
      passwordHash,
      role: "user",
      status: "active",
      username: "payout_atomicity_recipient",
    },
  ]);

  const payoutAmount = 25;
  const adminStartingBalance = 1000;
  await WalletModel.create([
    { availableUsdt: adminStartingBalance, userId: admin._id },
    { availableUsdt: 0, lifetimeRewardsUsdt: 0, userId: recipient._id },
  ]);

  const payout = await TransactionModel.create({
    amountUsdt: payoutAmount,
    network: "SYSTEM",
    payoutTier: "ATOMICITY_TEST",
    status: "pending",
    type: "reward",
    userId: recipient._id,
  });

  const originalDebitAdminPayout = walletRepository.debitAdminPayout;
  walletRepository.debitAdminPayout = async () => {
    throw new Error("Forced payout-ledger failure for atomicity test.");
  };

  try {
    let failed = false;
    try {
      await adminService.reviewPayout({
        action: "approve",
        adminUserId: String(admin._id),
        transactionId: String(payout._id),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("replica set")) {
        throw new Error(
          "Atomicity test requires MongoDB replica-set transactions. Start the production-style MongoDB replica set and retry.",
        );
      }
      failed = error instanceof Error && error.message.includes("Forced payout-ledger failure");
    }

    if (!failed) {
      throw new Error("Expected the forced payout-ledger failure was not observed.");
    }

    const [storedPayout, recipientWallet, adminWallet] = await Promise.all([
      TransactionModel.findById(payout._id).lean(),
      WalletModel.findOne({ userId: recipient._id }).lean(),
      WalletModel.findOne({ userId: admin._id }).lean(),
    ]);

    if (storedPayout?.status !== "pending") {
      throw new Error(`Payout was not rolled back. Status: ${storedPayout?.status}`);
    }
    if ((recipientWallet?.availableUsdt ?? 0) !== 0) {
      throw new Error("Recipient wallet was credited despite payout approval failure.");
    }
    if ((recipientWallet?.lifetimeRewardsUsdt ?? 0) !== 0) {
      throw new Error("Recipient lifetime rewards changed despite payout approval failure.");
    }
    if ((adminWallet?.availableUsdt ?? 0) !== adminStartingBalance) {
      throw new Error("Admin wallet changed despite payout approval failure.");
    }

    console.log("Payout approval atomicity test passed.");
  } finally {
    walletRepository.debitAdminPayout = originalDebitAdminPayout;
    await cleanup();
  }
}

run()
  .catch((error) => {
    console.error("Payout approval atomicity test failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDatabase();
    }
  });
