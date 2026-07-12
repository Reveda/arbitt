import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse, apiErrorResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";
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
  AdminWithdrawalReviewResponseDto,
  AdminWithdrawalsResponseDto,
} from "../dtos/admin-response.dto";
import { adminService } from "../services/admin.service";
import {
  adminPlanPurchaseParamsSchema,
  adminPayoutParamsSchema,
  adminWithdrawalParamsSchema,
  generateAdminPayoutsBodySchema,
  listAdminDepositsQuerySchema,
  listAdminPlanPurchasesQuerySchema,
  listAdminPayoutsQuerySchema,
  listAdminReferralsQuerySchema,
  listAdminUsersQuerySchema,
  listAdminWalletsQuerySchema,
  listAdminWithdrawalsQuerySchema,
  reviewAdminPlanPurchaseBodySchema,
  reviewAdminPayoutBodySchema,
  reviewAdminWithdrawalBodySchema,
  updateAdminPaymentWalletBodySchema,
  requestAdminPaymentWalletOtpBodySchema,
  adminOverviewQuerySchema,
  adminUserParamsSchema,
  editAdminUserBodySchema,
} from "../validations/admin.validation";

export const getAdminOverview = catchAsync(async (req: Request, res: Response) => {
  const query = adminOverviewQuerySchema.parse(req.query);
  const result = await adminService.getOverview(query);
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

export const listAdminWithdrawals = catchAsync(async (req: Request, res: Response) => {
  const query = listAdminWithdrawalsQuerySchema.parse(req.query);
  const result = await adminService.listWithdrawals(query);
  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<AdminWithdrawalsResponseDto>(HTTP_STATUS.OK, "Admin withdrawals loaded.", result),
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
    otp: body.otp,
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

export const requestAdminPaymentWalletOtp = catchAsync(async (req: Request, res: Response) => {
  const body = requestAdminPaymentWalletOtpBodySchema.parse(req.body);
  const result = await adminService.requestPaymentWalletOtp({
    address: body.address,
    network: body.network,
    adminUserId: req.user!.id,
    ipAddress: req.ip,
  });
  res.status(HTTP_STATUS.OK).json(apiResponse(HTTP_STATUS.OK, "Verification code sent to the admin email.", result));
});

export const generateAdminPayouts = catchAsync(async (req: Request, res: Response) => {
  const body = generateAdminPayoutsBodySchema.parse(req.body);
  try {
    const result = await adminService.generateWeeklyPayouts({
      weekStart: body.weekStart,
      payoutType: body.payoutType,
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
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(HTTP_STATUS.OK).json(apiErrorResponse(error.statusCode, error.message));
      return;
    }
    throw error;
  }
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

export const approveAllAdminPayouts = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.approveAllPendingPayouts({
    adminUserId: req.user!.id,
    ipAddress: req.ip,
  });

  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse(HTTP_STATUS.OK, "All pending payouts reviewed.", result));
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

export const reviewAdminWithdrawal = catchAsync(async (req: Request, res: Response) => {
  const params = adminWithdrawalParamsSchema.parse(req.params);
  const body = reviewAdminWithdrawalBodySchema.parse(req.body);
  const result = await adminService.reviewWithdrawal({
    transactionId: params.transactionId,
    adminUserId: req.user!.id,
    action: body.action,
    notes: body.notes,
    ipAddress: req.ip,
  });

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<AdminWithdrawalReviewResponseDto>(HTTP_STATUS.OK, "Withdrawal reviewed.", result),
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

export const exportAdminPayouts = catchAsync(async (req: Request, res: Response) => {
  const query = listAdminPayoutsQuerySchema.parse(req.query);
  const csvData = await adminService.exportPayoutsCsv(query);

  const filename = `payouts-export-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  res.status(HTTP_STATUS.OK).send(csvData);
});

export const editAdminUser = catchAsync(async (req: Request, res: Response) => {
  const params = adminUserParamsSchema.parse(req.params);
  const body = editAdminUserBodySchema.parse(req.body);
  const result = await adminService.editUser(params.userId, body);

  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse(HTTP_STATUS.OK, "User updated successfully.", result));
});

export const deleteAdminUser = catchAsync(async (req: Request, res: Response) => {
  const params = adminUserParamsSchema.parse(req.params);
  const result = await adminService.deleteUser(params.userId, req.user!.id);

  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse(HTTP_STATUS.OK, "User deleted successfully.", result));
});

import { superAdminService } from "../../super-admin/services/super-admin.service";
import { listSuperAdminTransactionsQuerySchema } from "../../super-admin/validations/super-admin.validation";

export const listAdminTransactions = catchAsync(async (req: Request, res: Response) => {
  const query = listSuperAdminTransactionsQuerySchema.parse(req.query) as Parameters<
    typeof superAdminService.listTransactions
  >[0];
  const result = await superAdminService.listTransactions(query);

  // Remap 'records' → 'transactions' so the frontend AdminTransactionsResponse type matches
  const mapped = {
    transactions: (result.records ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      chargeUsdt: r.chargeUsdt ?? 0,
      grossAmountUsdt: r.grossAmountUsdt ?? r.amountUsdt ?? 0,
    })),
    pagination: result.pagination,
    summary: result.summary,
  };

  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse(HTTP_STATUS.OK, "Admin transactions loaded.", mapped));
});
