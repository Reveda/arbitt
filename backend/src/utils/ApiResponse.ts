export type ApiResponsePayload<T> = {
  statusCode: number;
  success: true;
  message: string;
  data: T;
};

export type ApiErrorResponsePayload = {
  statusCode: number;
  success: false;
  message: string;
};

export type ApiResponseEnvelope<T> = ApiResponsePayload<T> | ApiErrorResponsePayload;

export type PaginationDto = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export function apiResponse<T>(
  statusCode: number,
  message: string,
  data: T,
): ApiResponsePayload<T> {
  return {
    statusCode,
    success: true,
    message,
    data,
  };
}

export function apiErrorResponse(statusCode: number, message: string): ApiErrorResponsePayload {
  return {
    statusCode,
    success: false,
    message,
  };
}

export function buildPaginationDto(input: {
  page: number;
  limit: number;
  total: number;
}): PaginationDto {
  const totalPages = Math.max(1, Math.ceil(input.total / input.limit));

  return {
    page: input.page,
    limit: input.limit,
    total: input.total,
    totalPages,
    hasNextPage: input.page < totalPages,
    hasPreviousPage: input.page > 1,
  };
}
