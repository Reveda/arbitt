import { connectDatabase, disconnectDatabase } from "../config/database";
import { logger } from "../config/logger";
import { TransactionModel } from "../modules/transactions/models/transaction.model";

async function updatePlanPurchaseHashes() {
  await connectDatabase();

  // Find plan purchases where txnHash is missing, null, or not set
  const query = {
    type: "plan_purchase",
    $or: [
      { txnHash: { $exists: false } },
      { txnHash: null },
      { txnHash: "" }
    ]
  };
  const transactions = await TransactionModel.find(query);

  logger.info(`Found ${transactions.length} plan purchase transactions without hashes.`);

  let updatedCount = 0;
  for (const tx of transactions) {
    const transactionIdStr = tx._id.toString();
    tx.txnHash = `SYS-${transactionIdStr.toUpperCase()}`;
    await tx.save();
    updatedCount++;
  }

  logger.info(`Successfully updated ${updatedCount} plan purchase transactions.`);
}

updatePlanPurchaseHashes()
  .catch((error) => {
    logger.error({ error }, "Plan purchase hash update script failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
