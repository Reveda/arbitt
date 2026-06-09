import { TransactionModel } from "../models/transaction.model";
import type {
  TransactionRepositoryRecord,
  UserTransactionListResult,
} from "../types/transaction.repository.types";

type UserTransactionListInput = {
  userId: string;
  type?: string;
  status?: string;
  dateRange?: {
    $gte?: Date;
    $lt?: Date;
  };
  skip: number;
  limit: number;
};

export class TransactionRepository {
  async findByUserId(input: UserTransactionListInput): Promise<UserTransactionListResult> {
    const filter = {
      userId: input.userId,
      ...(input.type ? { type: input.type } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.dateRange ? { createdAt: input.dateRange } : {}),
    };

    const [transactions, total] = await Promise.all([
      TransactionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(input.skip)
        .limit(input.limit)
        .lean(),
      TransactionModel.countDocuments(filter),
    ]);

    return { transactions, total };
  }

  async findPendingForAdmin(limit = 50): Promise<TransactionRepositoryRecord[]> {
    return TransactionModel.find({ status: "pending" }).sort({ createdAt: 1 }).limit(limit).lean();
  }

  countByStatus(status: string): Promise<number> {
    return TransactionModel.countDocuments({ status });
  }
}

export const transactionRepository = new TransactionRepository();
