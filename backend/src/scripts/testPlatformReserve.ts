import { connectDatabase, disconnectDatabase } from "../config/database";
import { TransactionModel } from "../modules/transactions/models/transaction.model";
import { WalletModel } from "../modules/wallet/models/wallet.model";
import { UserModel } from "../modules/users/models/user.model";

async function testPlatformReserve() {
  await connectDatabase();

  // 1. Count all transactions by type and status
  const allTransactions = await TransactionModel.aggregate([
    {
      $group: {
        _id: { type: "$type", status: "$status" },
        count: { $sum: 1 },
        totalUsdt: { $sum: "$amountUsdt" },
      },
    },
    { $sort: { "_id.type": 1, "_id.status": 1 } },
  ]);

  console.log("\n=== ALL TRANSACTIONS (by type & status) ===");
  for (const t of allTransactions) {
    console.log(
      `  ${t._id.type} | ${t._id.status} | count: ${t.count} | total: ${t.totalUsdt.toFixed(2)} USDT`
    );
  }

  // 2. Platform Reserve calculation
  const flowResult = await TransactionModel.aggregate([
    {
      $match: {
        status: { $in: ["approved", "completed"] },
        type: { $in: ["deposit", "withdrawal", "reward"] },
      },
    },
    {
      $group: {
        _id: null,
        totalDepositsUsdt: {
          $sum: { $cond: [{ $eq: ["$type", "deposit"] }, "$amountUsdt", 0] },
        },
        totalWithdrawalsUsdt: {
          $sum: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$amountUsdt", 0] },
        },
        totalRewardsUsdt: {
          $sum: { $cond: [{ $eq: ["$type", "reward"] }, "$amountUsdt", 0] },
        },
      },
    },
  ]);

  const flow = flowResult[0] ?? {
    totalDepositsUsdt: 0,
    totalWithdrawalsUsdt: 0,
    totalRewardsUsdt: 0,
  };

  const platformReserve =
    flow.totalDepositsUsdt - flow.totalWithdrawalsUsdt - flow.totalRewardsUsdt;

  console.log("\n=== PLATFORM RESERVE CALCULATION ===");
  console.log(`  Approved Deposits:     +${flow.totalDepositsUsdt.toFixed(2)} USDT`);
  console.log(`  Approved Withdrawals:  -${flow.totalWithdrawalsUsdt.toFixed(2)} USDT`);
  console.log(`  Approved Rewards:      -${flow.totalRewardsUsdt.toFixed(2)} USDT`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Platform Reserve:       ${platformReserve.toFixed(2)} USDT`);

  // 3. User wallets summary (non-admin)
  const userWallets = await WalletModel.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $match: { "user.role": { $nin: ["admin", "super_admin"] } },
    },
    {
      $group: {
        _id: null,
        totalAvailable: { $sum: "$availableUsdt" },
        totalLocked: { $sum: "$lockedUsdt" },
        totalDeposits: { $sum: "$lifetimeDepositsUsdt" },
        totalWithdrawals: { $sum: "$lifetimeWithdrawalsUsdt" },
        totalRewards: { $sum: "$lifetimeRewardsUsdt" },
        count: { $sum: 1 },
      },
    },
  ]);

  const uw = userWallets[0] ?? {};
  console.log("\n=== USER WALLETS (non-admin) ===");
  console.log(`  Count:        ${uw.count ?? 0}`);
  console.log(`  Available:    ${(uw.totalAvailable ?? 0).toFixed(2)} USDT`);
  console.log(`  Locked:       ${(uw.totalLocked ?? 0).toFixed(2)} USDT`);
  console.log(`  Deposits:     ${(uw.totalDeposits ?? 0).toFixed(2)} USDT`);
  console.log(`  Withdrawals:  ${(uw.totalWithdrawals ?? 0).toFixed(2)} USDT`);
  console.log(`  Rewards:      ${(uw.totalRewards ?? 0).toFixed(2)} USDT`);

  // 4. Admin wallet (raw)
  const adminUser = await UserModel.findOne({ role: "admin", status: "active" })
    .sort({ createdAt: 1 })
    .select("_id email username")
    .lean();

  if (adminUser) {
    const adminWallet = await WalletModel.findOne({ userId: adminUser._id }).lean();
    console.log("\n=== ADMIN WALLET (raw from DB) ===");
    console.log(`  Admin: ${adminUser.email} (${adminUser.username})`);
    console.log(`  availableUsdt:          ${(adminWallet?.availableUsdt ?? 0).toFixed(2)}`);
    console.log(`  lockedUsdt:             ${(adminWallet?.lockedUsdt ?? 0).toFixed(2)}`);
    console.log(`  lifetimeDepositsUsdt:   ${(adminWallet?.lifetimeDepositsUsdt ?? 0).toFixed(2)}`);
    console.log(`  lifetimeWithdrawalsUsdt:${(adminWallet?.lifetimeWithdrawalsUsdt ?? 0).toFixed(2)}`);
    console.log(`  lifetimeRewardsUsdt:    ${(adminWallet?.lifetimeRewardsUsdt ?? 0).toFixed(2)}`);
  }

  console.log("\n✅ Done\n");
}

testPlatformReserve()
  .catch((err) => {
    console.error("Script failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
