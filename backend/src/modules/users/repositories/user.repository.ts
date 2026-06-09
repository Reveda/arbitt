import { UserModel } from "../models/user.model";
import type { UserRepositoryRecord } from "../types/user.repository.types";

export class UserRepository {
  async findById(userId: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findById(userId).select("-passwordHash").lean();
  }

  async findByIdWithTransactionPassword(userId: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findById(userId).select("+transactionPasswordHash").lean();
  }

  async findByEmail(email: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim() }).lean();
  }

  async findByEmailWithPassword(email: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash").lean();
  }

  async findByReferralCode(referralCode: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ referralCode }).lean();
  }

  async findByUsername(username: string): Promise<UserRepositoryRecord | null> {
    return UserModel.findOne({ username: username.toLowerCase().trim() }).lean();
  }

  countUsers(): Promise<number> {
    return UserModel.countDocuments();
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
