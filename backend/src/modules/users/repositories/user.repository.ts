import { UserModel } from "../models/user.model";
import type { UserRepositoryRecord } from "../types/user.repository.types";

export class UserRepository {
  async findById(userId: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ _id: userId, isDeleted: { $ne: true } })
      .select("-passwordHash +transactionPasswordHash")
      .lean();
  }

  async findByIdWithTransactionPassword(userId: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ _id: userId, isDeleted: { $ne: true } })
      .select("+transactionPasswordHash")
      .lean();
  }

  async findByEmail(email: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim(), isDeleted: { $ne: true } }).lean();
  }

  async findByEmailWithPassword(email: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim(), isDeleted: { $ne: true } })
      .select("+passwordHash")
      .lean();
  }

  async findByReferralCode(referralCode: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ referralCode, isDeleted: { $ne: true } }).lean();
  }

  async findByUsername(username: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ username: username.toLowerCase().trim(), isDeleted: { $ne: true } }).lean();
  }

  countUsers(): Promise<number> {
    return UserModel.countDocuments({ isDeleted: { $ne: true } });
  }

  async updateWalletAddress(
    userId: string,
    walletAddress: string,
  ): Promise<UserRepositoryRecord | null> {
    return UserModel.findByIdAndUpdate(userId, { $set: { walletAddress } }, { new: true })
      .select("-passwordHash")
      .lean();
  }

  async updateTransactionPassword(
    userId: string,
    transactionPasswordHash: string,
  ): Promise<UserRepositoryRecord | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          transactionPasswordHash,
          transactionPasswordUpdatedAt: new Date(),
        },
      },
      { new: true },
    )
      .select("-passwordHash")
      .lean();
  }
}

export const userRepository = new UserRepository();
