import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import type {
  AdminDepositsResponseDto,
  AdminOverviewResponseDto,
  AdminPaymentWalletResponseDto,
  AdminPaymentWalletUpdateResponseDto,
  AdminPayoutGenerateResponseDto,
  AdminPayoutReviewResponseDto,
  AdminPayoutsResponseDto,
  AdminPlanPurchaseReviewResponseDto,
  AdminPlanPurchasesResponseDto,
  AdminReferralNetworkResponseDto,
  AdminUsersResponseDto,
  AdminWalletsResponseDto,
} from "../dtos/admin-response.dto";
import { adminService } from "../services/admin.service";
import {
  adminPlanPurchaseParamsSchema,
  adminPayoutParamsSchema,
  generateAdminPayoutsBodySchema,
  listAdminDepositsQuerySchema,
  listAdminPlanPurchasesQuerySchema,
  listAdminPayoutsQuerySchema,
  listAdminReferralsQuerySchema,
  listAdminUsersQuerySchema,
  listAdminWalletsQuerySchema,
  reviewAdminPlanPurchaseBodySchema,
  reviewAdminPayoutBodySchema,
  updateAdminPaymentWalletBodySchema,
} from "../validations/admin.validation";

export const getAdminOverview = catchAsync(async (_req: Request, res: Response) => {
  const result = await adminService.getOverview();
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<AdminOverviewResponseDto>(HTTP_STATUS.OK, "Admin overview loaded.", result));
});

export const listAdminUsers = catchAsync(async (req: Request, res: Response) => {
  const query = listAdminUsersQuerySchema.parse(req.query);
  const result = await adminService.listUsers(query);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<AdminUsersResponseDto>(HTTP_STATUS.OK, "Admin users loaded.", result));
});

export const listAdminDeposits = catchAsync(async (req: Request, res: Response) => {
  const query = listAdminDepositsQuerySchema.parse(req.query);
  const result = await adminService.listDeposits(query);
  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<AdminDepositsResponseDto>(HTTP_STATUS.OK, "Admin wallet top-ups loaded.", result),
    );
});

export const listAdminPayouts = catchAsync(async (req: Request, res: Response) => {
  const query = listAdminPayoutsQuerySchema.parse(req.query);
  const result = await adminService.listPayouts(query);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<AdminPayoutsResponseDto>(HTTP_STATUS.OK, "Admin payouts loaded.", result));
});

export const listAdminPlanPurchases = catchAsync(async (req: Request, res: Response) => {
  const query = listAdminPlanPurchasesQuerySchema.parse(req.query);
  const result = await adminService.listPlanPurchases(query);
  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<AdminPlanPurchasesResponseDto>(
        HTTP_STATUS.OK,
        "Admin plan purchases loaded.",
        result,
      ),
    );
});

export const listAdminWallets = catchAsync(async (req: Request, res: Response) => {
  const query = listAdminWalletsQuerySchema.parse(req.query);
  const result = await adminService.listWallets(query);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<AdminWalletsResponseDto>(HTTP_STATUS.OK, "Admin wallets loaded.", result));
});

export const getAdminPaymentWallet = catchAsync(async (_req: Request, res: Response) => {
  const result = await adminService.getPaymentWallet();
  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<AdminPaymentWalletResponseDto>(
        HTTP_STATUS.OK,
        "Admin payment wallet loaded.",
        result,
      ),
    );
});

export const updateAdminPaymentWallet = catchAsync(async (req: Request, res: Response) => {
  const body = updateAdminPaymentWalletBodySchema.parse(req.body);
  const result = await adminService.updatePaymentWallet({
    address: body.address,
    network: body.network,
    adminUserId: req.user!.id,
    ipAddress: req.ip,
  });

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<AdminPaymentWalletUpdateResponseDto>(
        HTTP_STATUS.OK,
        "Admin payment wallet updated.",
        result,
      ),
    );
});

export const generateAdminPayouts = catchAsync(async (req: Request, res: Response) => {
  const body = generateAdminPayoutsBodySchema.parse(req.body);
  const result = await adminService.generateWeeklyPayouts({
    weekStart: body.weekStart,
    returnStrategy: body.returnStrategy,
    adminUserId: req.user!.id,
    ipAddress: req.ip,
  });

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<AdminPayoutGenerateResponseDto>(
        HTTP_STATUS.OK,
        "Weekly payouts generated.",
        result,
      ),
    );
});

export const reviewAdminPayout = catchAsync(async (req: Request, res: Response) => {
  const params = adminPayoutParamsSchema.parse(req.params);
  const body = reviewAdminPayoutBodySchema.parse(req.body);
  const result = await adminService.reviewPayout({
    transactionId: params.transactionId,
    adminUserId: req.user!.id,
    action: body.action,
    notes: body.notes,
    ipAddress: req.ip,
  });

  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<AdminPayoutReviewResponseDto>(HTTP_STATUS.OK, "Payout reviewed.", result));
});

export const reviewAdminPlanPurchase = catchAsync(async (req: Request, res: Response) => {
  const params = adminPlanPurchaseParamsSchema.parse(req.params);
  const body = reviewAdminPlanPurchaseBodySchema.parse(req.body);
  const result = await adminService.reviewPlanPurchase({
    transactionId: params.transactionId,
    adminUserId: req.user!.id,
    action: body.action,
    notes: body.notes,
    ipAddress: req.ip,
  });

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<AdminPlanPurchaseReviewResponseDto>(
        HTTP_STATUS.OK,
        "Plan purchase reviewed.",
        result,
      ),
    );
});

export const listAdminReferrals = catchAsync(async (req: Request, res: Response) => {
  const query = listAdminReferralsQuerySchema.parse(req.query);
  const result = await adminService.listReferralNetwork(query);
  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<AdminReferralNetworkResponseDto>(
        HTTP_STATUS.OK,
        "Admin referral network loaded.",
        result,
      ),
    );
});
