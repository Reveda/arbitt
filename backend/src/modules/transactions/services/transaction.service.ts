import { transactionRepository } from "../repositories/transaction.repository";
import type { z } from "zod";
import { buildDateRangeFilter } from "../../../utils/dateRange";
import { buildPaginationDto } from "../../../utils/ApiResponse";
import { toTransactionNode } from "../dtos/transaction.dto";
import type { ListTransactionsResponseDto } from "../dtos/transaction.dto";
import type { listTransactionsQuerySchema } from "../validations/transaction.validation";

type ListTransactionsInput = z.infer<typeof listTransactionsQuerySchema>;

export class TransactionService {
  async listTransactions(
    userId: string,
    input: ListTransactionsInput,
  ): Promise<ListTransactionsResponseDto> {
    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;
    const { total, transactions } = await transactionRepository.findByUserId({
      userId,
      type: input.type,
      status: input.status,
      dateRange: buildDateRangeFilter({ fromDate: input.fromDate, toDate: input.toDate }),
      skip,
      limit,
    });

    return {
      transactions: transactions.map((transaction) => toTransactionNode(transaction)),
      pagination: buildPaginationDto({
        page,
        limit,
        total,
      }),
    };
  }
}

export const transactionService = new TransactionService();
