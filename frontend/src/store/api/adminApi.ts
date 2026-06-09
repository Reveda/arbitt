import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiSuccessResponse } from "@/api/types";
import type {
  AdminDepositsParams,
  AdminDepositsResponse,
  AdminOverview,
  AdminPayoutGenerateResponse,
  AdminPayoutReviewResponse,
  AdminPayoutsParams,
  AdminPayoutsResponse,
} from "@/services/admin.service";
import { baseApi } from "./baseApi";

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    query.set(key, String(value));
  });

  return query.toString();
}

function buildAdminDepositsPath(params: AdminDepositsParams) {
  const query = buildQuery({
    fromDate: params.fromDate,
    limit: params.limit,
    page: params.page,
    search: params.search,
    status: params.status,
    toDate: params.toDate,
  });

  return `${API_ENDPOINTS.admin.deposits}?${query}`;
}

function buildAdminPayoutsPath(params: AdminPayoutsParams) {
  const query = buildQuery({
    fromDate: params.fromDate,
    limit: params.limit,
    page: params.page,
    search: params.search,
    status: params.status,
    toDate: params.toDate,
    weekStart: params.weekStart,
  });

  return `${API_ENDPOINTS.admin.payouts}?${query}`;
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    adminOverview: builder.query<ApiSuccessResponse<AdminOverview>, void>({
      query: () => API_ENDPOINTS.admin.overview,
      providesTags: ["AdminOverview"],
    }),
    adminDeposits: builder.query<ApiSuccessResponse<AdminDepositsResponse>, AdminDepositsParams>({
      query: buildAdminDepositsPath,
      providesTags: ["AdminDeposits"],
    }),
    adminPayouts: builder.query<ApiSuccessResponse<AdminPayoutsResponse>, AdminPayoutsParams>({
      query: buildAdminPayoutsPath,
      providesTags: ["AdminPayouts"],
    }),
    generateAdminPayouts: builder.mutation<
      ApiSuccessResponse<AdminPayoutGenerateResponse>,
      { returnStrategy: "min" | "average" | "max"; weekStart?: string }
    >({
      query: (body) => ({
        body,
        method: "POST",
        url: `${API_ENDPOINTS.admin.payouts}/generate`,
      }),
      invalidatesTags: ["AdminOverview", "AdminPayouts", "AdminWallets"],
    }),
    reviewAdminPayout: builder.mutation<
      ApiSuccessResponse<AdminPayoutReviewResponse>,
      { action: "approve" | "reject"; notes?: string; transactionId: string }
    >({
      query: ({ transactionId, ...body }) => ({
        body,
        method: "PATCH",
        url: `${API_ENDPOINTS.admin.payouts}/${transactionId}/review`,
      }),
      invalidatesTags: ["AdminOverview", "AdminPayouts", "AdminWallets"],
    }),
  }),
});

export const {
  useAdminDepositsQuery,
  useAdminOverviewQuery,
  useAdminPayoutsQuery,
  useGenerateAdminPayoutsMutation,
  useReviewAdminPayoutMutation,
} = adminApi;
