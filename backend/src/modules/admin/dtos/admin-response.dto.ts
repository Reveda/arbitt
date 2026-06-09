import type { AdminService } from "../services/admin.service";

export type AdminOverviewResponseDto = Awaited<ReturnType<AdminService["getOverview"]>>;
export type AdminUsersResponseDto = Awaited<ReturnType<AdminService["listUsers"]>>;
export type AdminDepositsResponseDto = Awaited<ReturnType<AdminService["listDeposits"]>>;
export type AdminPayoutsResponseDto = Awaited<ReturnType<AdminService["listPayouts"]>>;
export type AdminPlanPurchasesResponseDto = Awaited<ReturnType<AdminService["listPlanPurchases"]>>;
export type AdminWalletsResponseDto = Awaited<ReturnType<AdminService["listWallets"]>>;
export type AdminPaymentWalletResponseDto = Awaited<ReturnType<AdminService["getPaymentWallet"]>>;
export type AdminPaymentWalletUpdateResponseDto = Awaited<
  ReturnType<AdminService["updatePaymentWallet"]>
>;
export type AdminPayoutGenerateResponseDto = Awaited<
  ReturnType<AdminService["generateWeeklyPayouts"]>
>;
export type AdminPayoutReviewResponseDto = Awaited<ReturnType<AdminService["reviewPayout"]>>;
export type AdminPlanPurchaseReviewResponseDto = Awaited<
  ReturnType<AdminService["reviewPlanPurchase"]>
>;
export type AdminReferralNetworkResponseDto = Awaited<
  ReturnType<AdminService["listReferralNetwork"]>
>;
