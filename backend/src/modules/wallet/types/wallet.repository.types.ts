export type WalletRepositoryRecord = {
  _id?: unknown;
  userId: unknown;
  availableUsdt?: number;
  lockedUsdt?: number;
  lifetimeDepositsUsdt?: number;
  lifetimeWithdrawalsUsdt?: number;
  lifetimeRewardsUsdt?: number;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};
