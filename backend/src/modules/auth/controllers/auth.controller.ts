import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { env } from "../../../config/env";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import { authService } from "../services/auth.service";
import { UserModel } from "../../users/models/user.model";
import { clearAuthCookies, setAuthCookies } from "../utils/auth.cookies";
import type {
  AuthResponseDto,
  EmailVerificationRequestResponseDto,
  ForgotPasswordResponseDto,
  InternalAuthResponseDto,
  LogoutResponseDto,
  ResetPasswordResponseDto,
  VerifyEmailResponseDto,
} from "../dtos/auth.dto";

function getRequestMeta(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? "",
  };
}

function stripTokens(payload: InternalAuthResponseDto): AuthResponseDto {
  const safeAuth: AuthResponseDto["auth"] = {
    tokenType: payload.auth.tokenType,
    accessTokenCookie: payload.auth.accessTokenCookie,
    refreshTokenCookie: payload.auth.refreshTokenCookie,
    ...(payload.auth.rotated !== undefined ? { rotated: payload.auth.rotated } : {}),
  };

  return {
    ...payload,
    auth: safeAuth,
  };
}

export const register = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.register(req.body, getRequestMeta(req));
  setAuthCookies(res, result.auth);
  res
    .status(HTTP_STATUS.CREATED)
    .json(
      apiResponse<AuthResponseDto>(
        HTTP_STATUS.CREATED,
        "Registered successfully.",
        stripTokens(result),
      ),
    );
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.login(req.body, getRequestMeta(req));
  setAuthCookies(res, result.auth);
  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<AuthResponseDto>(HTTP_STATUS.OK, "Logged in successfully.", stripTokens(result)),
    );
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body, getRequestMeta(req));
  res
    .status(HTTP_STATUS.ACCEPTED)
    .json(
      apiResponse<EmailVerificationRequestResponseDto>(
        HTTP_STATUS.ACCEPTED,
        "Password recovery request accepted.",
        result,
      ),
    );
});

export const requestEmailVerificationOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.requestEmailVerificationOtp(req.body, getRequestMeta(req));
  res
    .status(HTTP_STATUS.ACCEPTED)
    .json(
      apiResponse<ForgotPasswordResponseDto>(
        HTTP_STATUS.ACCEPTED,
        "Email verification OTP request accepted.",
        result,
      ),
    );
});

export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.verifyEmail(req.body, getRequestMeta(req));
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<VerifyEmailResponseDto>(HTTP_STATUS.OK, "Email verified.", result));
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.resetPassword(req.body, getRequestMeta(req));
  clearAuthCookies(res);
  res
    .status(HTTP_STATUS.OK)
    .json(
      apiResponse<ResetPasswordResponseDto>(HTTP_STATUS.OK, "Password reset successfully.", result),
    );
});

export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.refreshToken(
    req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME],
    getRequestMeta(req),
  );
  setAuthCookies(res, result.auth);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<AuthResponseDto>(HTTP_STATUS.OK, "Token refreshed.", stripTokens(result)));
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.logout(
    req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME],
    getRequestMeta(req),
  );
  clearAuthCookies(res);
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<LogoutResponseDto>(HTTP_STATUS.OK, "Logged out successfully.", result));
});

export const checkUsernameAvailability = catchAsync(async (req: Request, res: Response) => {
  const username = String(req.query.username || "").trim().toLowerCase();
  
  if (!username) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      apiResponse(HTTP_STATUS.BAD_REQUEST, "Username query parameter is required.", { available: false })
    );
    return;
  }

  if (username.length < 3) {
    res.status(HTTP_STATUS.OK).json(
      apiResponse(HTTP_STATUS.OK, "Username must be at least 3 characters long.", { available: false })
    );
    return;
  }

  const existingUser = await UserModel.findOne({ username });
  if (existingUser) {
    res.status(HTTP_STATUS.OK).json(
      apiResponse(HTTP_STATUS.OK, "Username is already taken.", { available: false })
    );
  } else {
    res.status(HTTP_STATUS.OK).json(
      apiResponse(HTTP_STATUS.OK, "Username is available.", { available: true })
    );
  }
});

export const checkReferralCode = catchAsync(async (req: Request, res: Response) => {
  const referralCode = String(req.query.referralCode || "").trim();

  if (!referralCode) {
    res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(apiResponse(HTTP_STATUS.BAD_REQUEST, "Referral code query parameter is required.", { valid: false }));
    return;
  }

  const owner = await authService.getReferralOwner(referralCode);
  res.status(HTTP_STATUS.OK).json(
    apiResponse(
      HTTP_STATUS.OK,
      owner ? "Referral code is valid." : "Invalid referral code.",
      { valid: Boolean(owner), referredBy: owner?.username ?? null },
    ),
  );
});
