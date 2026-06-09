import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import {
  type CreateDepositPaymentIntentResponseDto,
  type CreatePlanPaymentIntentResponseDto,
  type GetPaymentIntentResponseDto,
  type MoralisWebhookResponseDto,
  type SubmitPaymentIntentTxHashResponseDto,
} from "../dtos/payment.dto";
import { paymentService } from "../services/payment.service";
import {
  createDepositPaymentIntentSchema,
  createPlanPaymentIntentSchema,
  paymentIntentParamsSchema,
  submitPaymentIntentTxHashSchema,
} from "../validations/payment.validation";

export const createDepositPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const input = createDepositPaymentIntentSchema.parse(req.body);
  const result = await paymentService.createDepositPaymentIntent(req.user!.id, input);

  res
    .status(HTTP_STATUS.CREATED)
    .json(
      apiResponse<CreateDepositPaymentIntentResponseDto>(
        HTTP_STATUS.CREATED,
        "Deposit payment instructions generated.",
        result,
      ),
    );
});

export const createPlanPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const input = createPlanPaymentIntentSchema.parse(req.body);
  const result = await paymentService.createPlanPaymentIntent(req.user!.id, input);

  res
    .status(HTTP_STATUS.CREATED)
    .json(
      apiResponse<CreatePlanPaymentIntentResponseDto>(
        HTTP_STATUS.CREATED,
        "Payment instructions generated.",
        result,
      ),
    );
});

export const getPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const params = paymentIntentParamsSchema.parse(req.params);
  const result = await paymentService.getPaymentIntent(req.user!.id, params.intentId);

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<GetPaymentIntentResponseDto>(HTTP_STATUS.OK, "Payment intent loaded.", result),
    );
});

export const submitPaymentIntentTxHash = catchAsync(async (req: Request, res: Response) => {
  const params = paymentIntentParamsSchema.parse(req.params);
  const body = submitPaymentIntentTxHashSchema.parse(req.body);
  const result = await paymentService.submitPaymentIntentTxHash({
    intentId: params.intentId,
    txnHash: body.txnHash,
    userId: req.user!.id,
  });

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<SubmitPaymentIntentTxHashResponseDto>(
        HTTP_STATUS.OK,
        "Transaction hash linked.",
        result,
      ),
    );
});

export const handleMoralisWebhook = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.processMoralisWebhook({
    body: req.body,
    signature: req.headers["x-signature"],
  });

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<MoralisWebhookResponseDto>(HTTP_STATUS.OK, "Moralis webhook processed.", result),
    );
});
