import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import { apiRequest } from "@/api/apiClient";
import { ApiClientError } from "@/api/types";

type ApiBaseQueryArgs =
  | string
  | {
      body?: unknown;
      method?: string;
      skipAuthRefresh?: boolean;
      url: string;
    };

type ApiBaseQueryError = {
  message: string;
  statusCode: number;
};

const apiBaseQuery: BaseQueryFn<ApiBaseQueryArgs, unknown, ApiBaseQueryError> = async (args) => {
  const request = typeof args === "string" ? { url: args } : args;

  try {
    const response = await apiRequest(request.url, {
      body: request.body,
      method: request.method,
      skipAuthRefresh: request.skipAuthRefresh,
    });

    return { data: response };
  } catch (caughtError) {
    if (caughtError instanceof ApiClientError) {
      return {
        error: {
          message: caughtError.message,
          statusCode: caughtError.statusCode,
        },
      };
    }

    return {
      error: {
        message: caughtError instanceof Error ? caughtError.message : "API request failed.",
        statusCode: 0,
      },
    };
  }
};

export const baseApi = createApi({
  baseQuery: apiBaseQuery,
  endpoints: () => ({}),
  tagTypes: [
    "AdminDeposits",
    "AdminOverview",
    "AdminPayouts",
    "AdminWallets",
    "CurrentUser",
  ],
});
