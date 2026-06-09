import type { ErrorRequestHandler } from "express";
import { HTTP_STATUS } from "../constants/http";
import { logger } from "../config/logger";
import { ApiError } from "../utils/ApiError";
import { apiErrorResponse } from "../utils/ApiResponse";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const isKnownError = error instanceof ApiError;
  const statusCode = isKnownError ? error.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = isKnownError ? error.message : "Something went wrong.";

  if (!isKnownError || statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    logger.error({ error }, "Unhandled API error");
  }

  res.status(statusCode).json(apiErrorResponse(statusCode, message));
};
