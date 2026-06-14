import { connectDatabase, disconnectDatabase } from "../config/database";
import { logger } from "../config/logger";
import { TransactionModel } from "../modules/transactions/models/transaction.model";

async function updateMoralisNotes() {
  await connectDatabase();

  const query = { notes: { $regex: /Moralis verified/i } };
  const transactions = await TransactionModel.find(query);

  logger.info(`Found ${transactions.length} transactions with Moralis verified notes.`);

  let updatedCount = 0;
  for (const tx of transactions) {
    if (tx.notes) {
      const updatedNotes = tx.notes.replace(/Moralis verified/gi, "Tx verified");
      tx.notes = updatedNotes;
      await tx.save();
      updatedCount++;
    }
  }

  logger.info(`Successfully updated ${updatedCount} transactions to 'Tx verified'.`);
}

updateMoralisNotes()
  .catch((error) => {
    logger.error({ error }, "Moralis notes update script failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
