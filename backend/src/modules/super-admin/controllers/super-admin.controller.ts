import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import type {
  SuperAdminAdminsResponseDto,
  SuperAdminApiActivityResponseDto,
  SuperAdminAuditLogsResponseDto,
  SuperAdminNotificationsResponseDto,
  SuperAdminOverviewResponseDto,
  SuperAdminSettingsResponseDto,
  SuperAdminTransactionsResponseDto,
} from "../dtos/super-admin-response.dto";
import { superAdminService } from "../services/super-admin.service";
import {
  listSuperAdminAdminsQuerySchema,
  listSuperAdminApiActivityQuerySchema,
  listSuperAdminAuditLogsQuerySchema,
  listSuperAdminNotificationsQuerySchema,
  listSuperAdminSettingsQuerySchema,
  listSuperAdminTransactionsQuerySchema,
} from "../validations/super-admin.validation";

export const getSuperAdminOverview = catchAsync(async (_req: Request, res: Response) => {
  const result = await superAdminService.getOverview();

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<SuperAdminOverviewResponseDto>(
        HTTP_STATUS.OK,
        "Super Admin overview loaded.",
        result,
      ),
    );
});

export const listSuperAdminTransactions = catchAsync(async (req: Request, res: Response) => {
  const query = listSuperAdminTransactionsQuerySchema.parse(req.query) as Parameters<
    typeof superAdminService.listTransactions
  >[0];
  const result = await superAdminService.listTransactions(query);

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<SuperAdminTransactionsResponseDto>(
        HTTP_STATUS.OK,
        "Super Admin transactions loaded.",
        result,
      ),
    );
});

export const listSuperAdminAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const query = listSuperAdminAuditLogsQuerySchema.parse(req.query) as Parameters<
    typeof superAdminService.listAuditLogs
  >[0];
  const result = await superAdminService.listAuditLogs(query);

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<SuperAdminAuditLogsResponseDto>(
        HTTP_STATUS.OK,
        "Super Admin audit logs loaded.",
        result,
      ),
    );
});

export const listSuperAdminApiActivity = catchAsync(async (req: Request, res: Response) => {
  const query = listSuperAdminApiActivityQuerySchema.parse(req.query) as Parameters<
    typeof superAdminService.listApiActivity
  >[0];
  const result = await superAdminService.listApiActivity(query);

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<SuperAdminApiActivityResponseDto>(
        HTTP_STATUS.OK,
        "Super Admin API activity loaded.",
        result,
      ),
    );
});

export const listSuperAdminAdmins = catchAsync(async (req: Request, res: Response) => {
  const query = listSuperAdminAdminsQuerySchema.parse(req.query) as Parameters<
    typeof superAdminService.listAdmins
  >[0];
  const result = await superAdminService.listAdmins(query);

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<SuperAdminAdminsResponseDto>(
        HTTP_STATUS.OK,
        "Super Admin admins loaded.",
        result,
      ),
    );
});

export const listSuperAdminSettings = catchAsync(async (req: Request, res: Response) => {
  const query = listSuperAdminSettingsQuerySchema.parse(req.query) as Parameters<
    typeof superAdminService.listSettings
  >[0];
  const result = await superAdminService.listSettings(query);

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<SuperAdminSettingsResponseDto>(
        HTTP_STATUS.OK,
        "Super Admin settings loaded.",
        result,
      ),
    );
});

export const listSuperAdminNotifications = catchAsync(async (req: Request, res: Response) => {
  const query = listSuperAdminNotificationsQuerySchema.parse(req.query) as Parameters<
    typeof superAdminService.listNotifications
  >[0];
  const result = await superAdminService.listNotifications(query);

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<SuperAdminNotificationsResponseDto>(
        HTTP_STATUS.OK,
        "Super Admin notifications loaded.",
        result,
      ),
    );
});

export const fixTransactionStatus = catchAsync(async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  const { status, notes } = req.body;
  const adminUserId = req.user?.id;

  const result = await superAdminService.fixTransactionStatus(transactionId, status, notes, adminUserId);

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse(
        HTTP_STATUS.OK,
        "Transaction status overridden successfully.",
        result,
      ),
    );
});

export const getSuperAdminPayoutSummary = catchAsync(async (_req: Request, res: Response) => {
  const result = await superAdminService.getPayoutSummary();

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse(
        HTTP_STATUS.OK,
        "Super Admin payout summary loaded.",
        result,
      ),
    );
});

export const listSuperAdminSkippedPayouts = catchAsync(async (_req: Request, res: Response) => {
  const result = await superAdminService.detectSkippedPayouts();

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse(
        HTTP_STATUS.OK,
        "Skipped payout exceptions loaded.",
        result,
      ),
    );
});

export const processSuperAdminSkippedPayout = catchAsync(async (req: Request, res: Response) => {
  const { userId, payoutKind, amountUsdt, sourceId, notes } = req.body;
  const adminUserId = req.user?.id;

  const result = await superAdminService.processSkippedPayout({
    userId,
    payoutKind,
    amountUsdt,
    sourceId,
    notes,
    adminUserId,
  });

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse(
        HTTP_STATUS.OK,
        "Skipped payout successfully processed and credited.",
        result,
      ),
    );
});
