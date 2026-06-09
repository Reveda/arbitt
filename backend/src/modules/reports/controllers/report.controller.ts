import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import type { EarningsResponseDto, UserDashboardMetricsResponseDto } from "../dtos/report.dto";
import { reportService } from "../services/report.service";
import { listEarningsQuerySchema } from "../validations/report.validation";

export const getDashboardMetrics = catchAsync(async (req: Request, res: Response) => {
  const result = await reportService.getDashboardMetrics(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<UserDashboardMetricsResponseDto>(
        HTTP_STATUS.OK,
        "Dashboard metrics loaded.",
        result,
      ),
    );
});

export const getEarnings = catchAsync(async (req: Request, res: Response) => {
  const query = listEarningsQuerySchema.parse(req.query);
  const result = await reportService.getEarnings(req.user!.id, query);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<EarningsResponseDto>(HTTP_STATUS.OK, "Earnings loaded.", result));
});
