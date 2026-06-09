import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import type { ListTransactionsResponseDto } from "../dtos/transaction.dto";
import { transactionService } from "../services/transaction.service";
import { listTransactionsQuerySchema } from "../validations/transaction.validation";

export const listTransactions = catchAsync(async (req: Request, res: Response) => {
  const query = listTransactionsQuerySchema.parse(req.query);
  const result = await transactionService.listTransactions(req.user!.id, query);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<ListTransactionsResponseDto>(HTTP_STATUS.OK, "Transactions loaded.", result));
});
