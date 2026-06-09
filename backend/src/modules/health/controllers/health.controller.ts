import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { env } from "../../../config/env";
import { getRedisCacheStatus } from "../../../config/redis";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import type { HealthResponseDto } from "../dtos/health.dto";

export const getHealth = catchAsync(async (_req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json(
    apiResponse<HealthResponseDto>(HTTP_STATUS.OK, "Backend is healthy.", {
      service: "arbitrum-backend",
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      cache: {
        redis: getRedisCacheStatus(),
      },
    }),
  );
});
