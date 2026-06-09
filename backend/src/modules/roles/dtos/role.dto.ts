import type { UserRole } from "../../../constants/roles";

export type RoleDto = {
  id: string;
  name: UserRole;
  displayName: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
};

export type ListRolesResponseDto = {
  roles: RoleDto[];
};
