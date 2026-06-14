import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiSuccessResponse } from "@/api/types";
import { baseApi } from "./baseApi";

export type SupportTicket = {
  _id: string;
  userId: string | { _id: string; email: string; username: string };
  subject: string;
  message: string;
  status: "pending" | "resolved";
  reply: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const supportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    userSupportTickets: builder.query<ApiSuccessResponse<SupportTicket[]>, void>({
      query: () => API_ENDPOINTS.users.supportTickets,
      providesTags: ["SupportTickets"],
    }),
    createSupportTicket: builder.mutation<
      ApiSuccessResponse<SupportTicket>,
      { subject: string; message: string }
    >({
      query: (body) => ({
        body,
        method: "POST",
        url: API_ENDPOINTS.users.supportTickets,
      }),
      invalidatesTags: ["SupportTickets"],
    }),
    adminSupportTickets: builder.query<ApiSuccessResponse<SupportTicket[]>, void>({
      query: () => API_ENDPOINTS.admin.supportTickets,
      providesTags: ["SupportTickets"],
    }),
    resolveSupportTicket: builder.mutation<
      ApiSuccessResponse<SupportTicket>,
      { ticketId: string; reply: string }
    >({
      query: ({ ticketId, reply }) => ({
        body: { reply },
        method: "POST",
        url: API_ENDPOINTS.admin.resolveSupportTicket(ticketId),
      }),
      invalidatesTags: ["SupportTickets"],
    }),
  }),
});

export const {
  useUserSupportTicketsQuery,
  useCreateSupportTicketMutation,
  useAdminSupportTicketsQuery,
  useResolveSupportTicketMutation,
} = supportApi;
