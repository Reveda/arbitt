import { WalletModel } from "../models/wallet.model";
import { UserModel } from "../../users/models/user.model";
import type { WalletRepositoryRecord } from "../types/wallet.repository.types";

export class WalletRepository {
  private async findPrimaryAdminUserId(): Promise<unknown | null> {
    const admin = await UserModel.findOne({ role: "admin", status: "active" })
      .sort({ createdAt: 1 })
      .select("_id")
      .lean();

    return admin?._id ?? null;
  }

  async findByUserId(userId: string): Promise<WalletRepositoryRecord | null> {
    return WalletModel.findOne({ userId }).lean();
  }

  ensureWallet(userId: string): Promise<WalletRepositoryRecord | null> {
    return WalletModel.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      { new: true, upsert: true },
    ).lean();
  }

  async createDefaultWallet(userId: string): Promise<WalletRepositoryRecord> {
    const wallet = await WalletModel.create({ userId });
    return wallet.toObject() as WalletRepositoryRecord;
  }

  creditDeposit(userId: string, amountUsdt: number): Promise<WalletRepositoryRecord | null> {
    return WalletModel.findOneAndUpdate(
      { userId },
      {
        $inc: {
          availableUsdt: amountUsdt,
          lifetimeDepositsUsdt: amountUsdt,
        },
        $setOnInsert: { userId },
      },
      { new: true, upsert: true },
    ).lean();
  }

  creditReward(userId: string, amountUsdt: number): Promise<WalletRepositoryRecord | null> {
    return WalletModel.findOneAndUpdate(
      { userId },
      {
        $inc: {
          availableUsdt: amountUsdt,
          lifetimeRewardsUsdt: amountUsdt,
        },
        $setOnInsert: { userId },
      },
      { new: true, upsert: true },
    ).lean();
  }

  lockPlanAmount(userId: string, amountUsdt: number): Promise<WalletRepositoryRecord | null> {
    return WalletModel.findOneAndUpdate(
      {
        availableUsdt: { $gte: amountUsdt },
        userId,
      },
      {
        $inc: {
          availableUsdt: -amountUsdt,
          lockedUsdt: amountUsdt,
        },
      },
      { new: true },
    ).lean();
  }

  unlockPlanAmount(userId: string, amountUsdt: number): Promise<WalletRepositoryRecord | null> {
    return WalletModel.findOneAndUpdate(
      { userId },
      {
        $inc: {
          availableUsdt: amountUsdt,
          lockedUsdt: -amountUsdt,
        },
      },
      { new: true },
    ).lean();
  }

  lockWithdrawalAmount(userId: string, amountUsdt: number): Promise<WalletRepositoryRecord | null> {
    return WalletModel.findOneAndUpdate(
      {
        availableUsdt: { $gte: amountUsdt },
        userId,
      },
      {
        $inc: {
          availableUsdt: -amountUsdt,
          lockedUsdt: amountUsdt,
        },
      },
      { new: true },
    ).lean();
  }

  unlockWithdrawalAmount(
    userId: string,
    amountUsdt: number,
  ): Promise<WalletRepositoryRecord | null> {
    return WalletModel.findOneAndUpdate(
      {
        lockedUsdt: { $gte: amountUsdt },
        userId,
      },
      {
        $inc: {
          availableUsdt: amountUsdt,
          lockedUsdt: -amountUsdt,
        },
      },
      { new: true },
    ).lean();
  }

  completeWithdrawalAmount(
    userId: string,
    amountUsdt: number,
  ): Promise<WalletRepositoryRecord | null> {
    return WalletModel.findOneAndUpdate(
      {
        lockedUsdt: { $gte: amountUsdt },
        userId,
      },
      {
        $inc: {
          lifetimeWithdrawalsUsdt: amountUsdt,
          lockedUsdt: -amountUsdt,
        },
      },
      { new: true },
    ).lean();
  }

  async creditAdminPlanPurchase(amountUsdt: number): Promise<WalletRepositoryRecord | null> {
    const adminUserId = await this.findPrimaryAdminUserId();

    if (!adminUserId) {
      return null;
    }

    return WalletModel.findOneAndUpdate(
      { userId: adminUserId },
      {
        $inc: {
          availableUsdt: amountUsdt,
          lifetimeDepositsUsdt: amountUsdt,
        },
        $setOnInsert: { userId: adminUserId },
      },
      { new: true, upsert: true },
    ).lean();
  }

  async debitAdminPayout(amountUsdt: number): Promise<WalletRepositoryRecord | null> {
    const adminUserId = await this.findPrimaryAdminUserId();

    if (!adminUserId) {
      return null;
    }

    return WalletModel.findOneAndUpdate(
      { userId: adminUserId },
      {
        $inc: {
          availableUsdt: -amountUsdt,
          lifetimeRewardsUsdt: amountUsdt,
        },
        $setOnInsert: { userId: adminUserId },
      },
      { new: true, upsert: true },
    ).lean();
  }

  async getPrimaryAdminAvailableUsdt(): Promise<number> {
    const adminUserId = await this.findPrimaryAdminUserId();

    if (!adminUserId) {
      return 0;
    }

    const wallet = await WalletModel.findOne({ userId: adminUserId })
      .select("availableUsdt")
      .lean();

    return wallet?.availableUsdt ?? 0;
  }

  async debitAdminWithdrawal(amountUsdt: number): Promise<WalletRepositoryRecord | null> {
    const adminUserId = await this.findPrimaryAdminUserId();

    if (!adminUserId) {
      return null;
    }

    return WalletModel.findOneAndUpdate(
      { userId: adminUserId },
      {
        $inc: {
          availableUsdt: -amountUsdt,
          lifetimeWithdrawalsUsdt: amountUsdt,
        },
        $setOnInsert: { userId: adminUserId },
      },
      { new: true, upsert: true },
    ).lean();
  }

  countWallets(): Promise<number> {
    return WalletModel.countDocuments();
  }
}

export const walletRepository = new WalletRepository();
