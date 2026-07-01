import { connectDatabase, disconnectDatabase } from "../config/database";
import { WalletModel } from "../modules/wallet/models/wallet.model";
import { TransactionModel } from "../modules/transactions/models/transaction.model";
import { Types } from "mongoose";

async function main() {
  await connectDatabase();
  console.log("Database connected successfully.");

  const wallets = await WalletModel.find({}).lean();
  console.log(`Found ${wallets.length} wallets. Checking locked balances...`);

  for (const wallet of wallets) {
    // Calculate the actual locked amount (pending withdrawals + pending plan purchases)
    const pendingTxns = await TransactionModel.find({
      userId: wallet.userId,
      status: "pending",
      type: { $in: ["withdrawal", "plan_purchase"] }
    }).lean();

    let actualLocked = 0;
    for (const txn of pendingTxns) {
      // Use payoutPrincipalUsdt (gross withdrawal) or fallback to amountUsdt
      actualLocked += txn.payoutPrincipalUsdt ?? txn.amountUsdt ?? 0;
    }

    // Round to 2 decimal places
    actualLocked = Math.round(actualLocked * 100) / 100;

    if (wallet.lockedUsdt !== actualLocked) {
      await WalletModel.updateOne(
        { _id: wallet._id },
        { $set: { lockedUsdt: actualLocked } }
      );
      console.log(`Updated user ${wallet.userId}: lockedUsdt corrected to ${actualLocked} USDT (was ${wallet.lockedUsdt} USDT)`);
    } else {
      console.log(`User ${wallet.userId}: lockedUsdt is already correct (${actualLocked} USDT)`);
    }
  }

  console.log("Locked balance correction completed.");
  await disconnectDatabase();
}

main().catch(console.error);
