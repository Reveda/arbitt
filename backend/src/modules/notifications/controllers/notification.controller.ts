import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import type { ListNotificationsResponseDto } from "../dtos/notification.dto";
import { notificationService } from "../services/notification.service";

export const listNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await notificationService.listNotifications(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<ListNotificationsResponseDto>(HTTP_STATUS.OK, "Notifications loaded.", result),
    );
});
