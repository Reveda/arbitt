import { HTTP_STATUS } from "../../../constants/http";
import { ApiError } from "../../../utils/ApiError";
import { comparePassword, hashPassword } from "../../../utils/password";
import { toSafeUser } from "../../auth/dtos/auth.dto";
import type {
  CurrentUserResponseDto,
  UpdateUserResponseDto,
  UserProfileResponseDto,
} from "../dtos/user-response.dto";
import { userRepository } from "../repositories/user.repository";
import type {
  updateTransactionPasswordSchema,
  updateWalletAddressSchema,
} from "../validations/user.validation";
import type { z } from "zod";

type UpdateWalletAddressInput = z.infer<typeof updateWalletAddressSchema>;
type UpdateTransactionPasswordInput = z.infer<typeof updateTransactionPasswordSchema>;

export class UserService {
  async getCurrentUser(userId: string): Promise<CurrentUserResponseDto> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    return { user: toSafeUser(user) };
  }

  async getUserProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    return {
      profile: toSafeUser(user),
    };
  }

  async updateWalletAddress(
    userId: string,
    input: UpdateWalletAddressInput,
  ): Promise<UpdateUserResponseDto> {
    const user = await userRepository.updateWalletAddress(userId, input.walletAddress.trim());

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    return { user: toSafeUser(user) };
  }

  async updateTransactionPassword(
    userId: string,
    input: UpdateTransactionPasswordInput,
  ): Promise<UpdateUserResponseDto> {
    const user = await userRepository.findByIdWithTransactionPassword(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const currentTransactionPassword = input.currentTransactionPassword?.trim();
    const nextTransactionPassword = input.transactionPassword.trim();

    if (user.transactionPasswordHash) {
      if (!currentTransactionPassword) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Current transaction password is required.");
      }

      const passwordMatched = await comparePassword(
        currentTransactionPassword,
        user.transactionPasswordHash,
      );

      if (!passwordMatched) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Current transaction password is incorrect.");
      }
    }

    const transactionPasswordHash = await hashPassword(nextTransactionPassword);
    const updatedUser = await userRepository.updateTransactionPassword(
      userId,
      transactionPasswordHash,
    );

    if (!updatedUser) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    return { user: toSafeUser(updatedUser) };
  }
}

export const userService = new UserService();
