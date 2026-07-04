import { connectDatabase, disconnectDatabase } from "../config/database";
import { logger } from "../config/logger";
import { UserModel } from "../modules/users/models/user.model";
import { TransactionModel } from "../modules/transactions/models/transaction.model";
import { UserPlanPurchaseModel } from "../modules/plans/models/user-plan-purchase.model";

async function run() {
  logger.info("Connecting to database to sync production indexes...");
  await connectDatabase();

  try {
    logger.info("Syncing indexes for User model...");
    await UserModel.syncIndexes();

    logger.info("Syncing indexes for Transaction model...");
    await TransactionModel.syncIndexes();

    logger.info("Syncing indexes for UserPlanPurchase model...");
    await UserPlanPurchaseModel.syncIndexes();

    logger.info("Database indexes successfully synced for production scaling!");
  } catch (err) {
    logger.error(`Failed to sync database indexes: ${err}`);
  } finally {
    await disconnectDatabase();
  }
}

run().catch((err) => {
  logger.error(`Failed to run indexes setup: ${err}`);
  process.exit(1);
});
