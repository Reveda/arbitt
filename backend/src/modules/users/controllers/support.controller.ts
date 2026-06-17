import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import { supportTicketService } from "../services/support-ticket.service";

export const createSupportTicket = catchAsync(async (req: Request, res: Response) => {
  const result = await supportTicketService.createTicket(req.user!.id, req.body);
  res
    .status(HTTP_STATUS.CREATED)
    .json(apiResponse(HTTP_STATUS.CREATED, "Support ticket created successfully.", result));
});

export const listUserSupportTickets = catchAsync(async (req: Request, res: Response) => {
  const result = await supportTicketService.getUserTickets(req.user!.id);
  res.status(HTTP_STATUS.OK).json(apiResponse(HTTP_STATUS.OK, "Support tickets loaded.", result));
});
