import type { SafeUserDto } from "../../auth/dtos/auth.dto";

export type CurrentUserResponseDto = {
  user: SafeUserDto;
};

export type UserProfileResponseDto = {
  profile: SafeUserDto;
};

export type UpdateUserResponseDto = {
  user: SafeUserDto;
};
