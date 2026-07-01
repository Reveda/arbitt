import type { PaginationDto } from "../../../utils/ApiResponse";
import type { PlatformPaymentWallet } from "../../admin/services/payment-wallet.service";
import type { TransactionDto } from "../../transactions/dtos/transaction.dto";

export type WalletBalanceDto = {
  availableUsdt: number;
  lockedUsdt: number;
  lifetimeDepositsUsdt: number;
  lifetimeWithdrawalsUsdt: number;
  lifetimeRewardsUsdt: number;
  topUpBalance?: number;
};

export type WalletSummaryResponseDto = WalletBalanceDto & {
  platformDepositWallet: PlatformPaymentWallet;
};

export type CreateDepositResponseDto = TransactionDto & {
  wallet: WalletBalanceDto;
};

export type ListDepositsResponseDto = {
  deposits: TransactionDto[];
  pagination: PaginationDto;
};

export type CreateWithdrawalResponseDto = TransactionDto & {
  chargeUsdt: number;
  grossAmountUsdt: number;
  netAmountUsdt: number;
  wallet: WalletBalanceDto;
  withdrawalChargePercent: number;
};
