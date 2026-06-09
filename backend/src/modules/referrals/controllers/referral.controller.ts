import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import type {
  ListTeamMembersResponseDto,
  ReferralSummaryResponseDto,
  ReferralTreeResponseDto,
} from "../dtos/referral.dto";
import { referralService } from "../services/referral.service";
import { listReferralMembersQuerySchema } from "../validations/referral.validation";

export const getReferralTree = catchAsync(async (req: Request, res: Response) => {
  const result = await referralService.getReferralTree(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<ReferralTreeResponseDto>(HTTP_STATUS.OK, "Referral tree loaded.", result));
});

export const getReferralSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await referralService.getReferralSummary(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<ReferralSummaryResponseDto>(HTTP_STATUS.OK, "Referral summary loaded.", result),
    );
});

export const listReferralMembers = catchAsync(async (req: Request, res: Response) => {
  const query = listReferralMembersQuerySchema.parse(req.query);
  const result = await referralService.listTeamMembers({
    userId: req.user!.id,
    page: query.page,
    limit: query.limit,
    search: query.search,
  });

  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<ListTeamMembersResponseDto>(HTTP_STATUS.OK, "Referral members loaded.", result),
    );
});
