import type { NextFunction, Request, Response } from "express";
import { HTTP_STATUS } from "../constants/http";
import type { ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError";

type ValidationSchemas = {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
};

export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsedBody = schemas.body?.safeParse(req.body);
    if (parsedBody && !parsedBody.success) {
      return next(
        new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          parsedBody.error.issues[0]?.message ?? "Invalid body.",
        ),
      );
    }

    const parsedParams = schemas.params?.safeParse(req.params);
    if (parsedParams && !parsedParams.success) {
      return next(
        new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          parsedParams.error.issues[0]?.message ?? "Invalid params.",
        ),
      );
    }

    const parsedQuery = schemas.query?.safeParse(req.query);
    if (parsedQuery && !parsedQuery.success) {
      return next(
        new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          parsedQuery.error.issues[0]?.message ?? "Invalid query.",
        ),
      );
    }

    return next();
  };
}
