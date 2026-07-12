import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { PaymentIntentModel } from "../modules/payments/models/payment-intent.model";
import { TransactionModel } from "../modules/transactions/models/transaction.model";

function normalizeHash(value: unknown) {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/i.test(value)
    ? value.toLowerCase()
    : null;
}

async function main() {
  await connectDatabase();

  const transactions = await TransactionModel.find({ txnHash: /^0x/i }).select("_id txnHash").lean();
  const transactionHashes = new Map<string, string>();
  const transactionUpdates = [];

  for (const transaction of transactions) {
    const normalized = normalizeHash(transaction.txnHash);
    if (!normalized) continue;
    const existingId = transactionHashes.get(normalized);
    if (existingId && existingId !== String(transaction._id)) {
      throw new Error(`Case-insensitive transaction hash collision detected: ${normalized}`);
    }
    transactionHashes.set(normalized, String(transaction._id));
    if (transaction.txnHash !== normalized) {
      transactionUpdates.push({
        updateOne: { filter: { _id: transaction._id }, update: { $set: { txnHash: normalized } } },
      });
    }
  }

  const paymentIntents = await PaymentIntentModel.find({ txnHash: /^0x/i })
    .select("_id txnHash txnHashNormalized")
    .lean();
  const paymentUpdates = paymentIntents.flatMap((intent) => {
    const normalized = normalizeHash(intent.txnHash);
    return normalized
      ? [{
          updateOne: {
            filter: { _id: intent._id },
            update: { $set: { txnHash: normalized, txnHashNormalized: normalized } },
          },
        }]
      : [];
  });

  if (transactionUpdates.length) await TransactionModel.bulkWrite(transactionUpdates);
  if (paymentUpdates.length) await PaymentIntentModel.bulkWrite(paymentUpdates);

  console.log(
    `Normalized ${transactionUpdates.length} transaction hashes and ${paymentUpdates.length} payment intent hashes.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await disconnectDatabase();
  });
