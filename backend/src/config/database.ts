import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";
import { TransactionModel } from "../modules/transactions/models/transaction.model";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== "production",
  });

  if (env.NODE_ENV !== "production") {
    await TransactionModel.syncIndexes();
  }

  logger.info("MongoDB connected");
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected");
}
