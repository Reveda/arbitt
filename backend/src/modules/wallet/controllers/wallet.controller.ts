import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import type {
  CreateDepositResponseDto,
  CreateWithdrawalResponseDto,
  ListDepositsResponseDto,
  WalletSummaryResponseDto,
} from "../dtos/wallet.dto";
import { walletService } from "../services/wallet.service";
import {
  createDepositRequestSchema,
  listDepositRequestsQuerySchema,
} from "../validations/wallet.validation";

export const getWalletSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await walletService.getWalletSummary(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<WalletSummaryResponseDto>(HTTP_STATUS.OK, "Wallet summary loaded.", result));
});

export const createDepositRequest = catchAsync(async (req: Request, res: Response) => {
  const input = createDepositRequestSchema.parse(req.body);
  const result = await walletService.createDepositRequest(req.user!.id, input);
  res
    .status(HTTP_STATUS.CREATED)
    .json(
      apiResponse<CreateDepositResponseDto>(HTTP_STATUS.CREATED, "Wallet balance added.", result),
    );
});

export const listDepositRequests = catchAsync(async (req: Request, res: Response) => {
  const query = listDepositRequestsQuerySchema.parse(req.query);
  const result = await walletService.listDepositRequests(req.user!.id, query);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<ListDepositsResponseDto>(HTTP_STATUS.OK, "Deposit requests loaded.", result));
});

export const createWithdrawalRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await walletService.createWithdrawalRequest(req.user!.id);
  res
    .status(HTTP_STATUS.ACCEPTED)
    .json(
      apiResponse<CreateWithdrawalResponseDto>(
        HTTP_STATUS.ACCEPTED,
        "Withdrawal request accepted.",
        result,
      ),
    );
});
