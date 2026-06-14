import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import { supportTicketService } from "../../users/services/support-ticket.service";

export const listAdminSupportTickets = catchAsync(async (req: Request, res: Response) => {
  const result = await supportTicketService.getAllTickets();
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse(HTTP_STATUS.OK, "All support tickets loaded.", result));
});

export const resolveSupportTicket = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reply } = req.body;

  const result = await supportTicketService.resolveTicket(id, reply);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse(HTTP_STATUS.OK, "Support ticket resolved successfully.", result));
});
