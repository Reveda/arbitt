import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiSuccessResponse } from "@/api/types";
import type {
  AuthPayload,
  AuthUser,
  EmailVerificationPayload,
  ForgotPasswordPayload,
  LoginPayload,
  OtpDelivery,
  RegisterPayload,
  ResetPasswordPayload,
  ResetPasswordResult,
  UpdateTransactionPasswordPayload,
  UpdateWalletAddressPayload,
  VerifyEmailPayload,
  VerifyEmailResult,
} from "@/services/auth.service";
import { baseApi } from "./baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    currentUser: builder.query<ApiSuccessResponse<{ user: AuthUser }>, void>({
      query: () => API_ENDPOINTS.users.me,
      providesTags: ["CurrentUser"],
      keepUnusedDataFor: 30,
    }),
    login: builder.mutation<ApiSuccessResponse<AuthPayload>, LoginPayload>({
      query: (body) => ({
        body,
        method: "POST",
        url: API_ENDPOINTS.auth.login,
      }),
      invalidatesTags: ["CurrentUser"],
    }),
    register: builder.mutation<ApiSuccessResponse<AuthPayload>, RegisterPayload>({
      query: (body) => ({
        body,
        method: "POST",
        url: API_ENDPOINTS.auth.register,
      }),
      invalidatesTags: ["CurrentUser"],
    }),
    forgotPassword: builder.mutation<
      ApiSuccessResponse<OtpDelivery & { accepted: boolean }>,
      ForgotPasswordPayload
    >({
      query: (body) => ({
        body,
        method: "POST",
        url: API_ENDPOINTS.auth.forgotPassword,
      }),
    }),
    requestEmailVerification: builder.mutation<
      ApiSuccessResponse<OtpDelivery & { accepted: boolean }>,
      EmailVerificationPayload
    >({
      query: (body) => ({
        body,
        method: "POST",
        url: API_ENDPOINTS.auth.requestEmailVerification,
      }),
    }),
    verifyEmail: builder.mutation<ApiSuccessResponse<VerifyEmailResult>, VerifyEmailPayload>({
      query: (body) => ({
        body,
        method: "POST",
        url: API_ENDPOINTS.auth.verifyEmail,
      }),
      invalidatesTags: ["CurrentUser"],
    }),
    resetPassword: builder.mutation<ApiSuccessResponse<ResetPasswordResult>, ResetPasswordPayload>({
      query: (body) => ({
        body,
        method: "POST",
        url: API_ENDPOINTS.auth.resetPassword,
      }),
      invalidatesTags: ["CurrentUser"],
    }),
    logout: builder.mutation<ApiSuccessResponse<{ loggedOut: boolean }>, void>({
      query: () => ({
        method: "POST",
        url: API_ENDPOINTS.auth.logout,
      }),
      invalidatesTags: ["CurrentUser"],
    }),
    updateWalletAddress: builder.mutation<
      ApiSuccessResponse<{ user: AuthUser }>,
      UpdateWalletAddressPayload
    >({
      query: (body) => ({
        body,
        method: "PATCH",
        url: API_ENDPOINTS.users.walletAddress,
      }),
      invalidatesTags: ["CurrentUser"],
    }),
    updateTransactionPassword: builder.mutation<
      ApiSuccessResponse<{ user: AuthUser }>,
      UpdateTransactionPasswordPayload
    >({
      query: (body) => ({
        body,
        method: "PATCH",
        url: API_ENDPOINTS.users.transactionPassword,
      }),
      invalidatesTags: ["CurrentUser"],
    }),
  }),
});

export const {
  useCurrentUserQuery,
  useForgotPasswordMutation,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useRequestEmailVerificationMutation,
  useResetPasswordMutation,
  useUpdateTransactionPasswordMutation,
  useUpdateWalletAddressMutation,
  useVerifyEmailMutation,
} = authApi;
