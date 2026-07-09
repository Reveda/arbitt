import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import type {
  CurrentUserResponseDto,
  UpdateUserResponseDto,
  UserProfileResponseDto,
} from "../dtos/user-response.dto";
import { userService } from "../services/user.service";

export const getCurrentUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getCurrentUser(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<CurrentUserResponseDto>(HTTP_STATUS.OK, "Current user loaded.", result));
});

export const getUserProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getUserProfile(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<UserProfileResponseDto>(HTTP_STATUS.OK, "User profile loaded.", result));
});

export const updateWalletAddress = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.updateWalletAddress(req.user!.id, req.body);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<UpdateUserResponseDto>(HTTP_STATUS.OK, "Wallet address updated.", result));
});

export const requestWalletAddressChangeOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.requestWalletAddressChangeOtp(req.user!.id, req.body, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
  });
  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse(
        HTTP_STATUS.OK,
        "Wallet address change OTP request accepted.",
        result,
      ),
    );
});

export const verifyWalletAddressChangeOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.verifyWalletAddressChangeOtp(req.user!.id, req.body, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
  });
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<UpdateUserResponseDto>(HTTP_STATUS.OK, "Wallet address updated.", result));
});

export const updateTransactionPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.updateTransactionPassword(req.user!.id, req.body);
  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<UpdateUserResponseDto>(HTTP_STATUS.OK, "Transaction password updated.", result),
    );
});
