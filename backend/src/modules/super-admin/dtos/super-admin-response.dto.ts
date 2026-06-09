import type { SuperAdminService } from "../services/super-admin.service";

export type SuperAdminTransactionsResponseDto = Awaited<
  ReturnType<SuperAdminService["listTransactions"]>
>;
export type SuperAdminAuditLogsResponseDto = Awaited<
  ReturnType<SuperAdminService["listAuditLogs"]>
>;
export type SuperAdminAdminsResponseDto = Awaited<ReturnType<SuperAdminService["listAdmins"]>>;
export type SuperAdminSettingsResponseDto = Awaited<ReturnType<SuperAdminService["listSettings"]>>;
export type SuperAdminNotificationsResponseDto = Awaited<
  ReturnType<SuperAdminService["listNotifications"]>
>;
export type SuperAdminApiActivityResponseDto = Awaited<
  ReturnType<SuperAdminService["listApiActivity"]>
>;
export type SuperAdminOverviewResponseDto = Awaited<ReturnType<SuperAdminService["getOverview"]>>;
