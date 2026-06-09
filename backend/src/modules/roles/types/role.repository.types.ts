import type { UserRole } from "../../../constants/roles";

export type RoleRepositoryRecord = {
  _id?: unknown;
  name?: UserRole;
  displayName?: string;
  description?: string;
  permissions?: string[];
  isSystem?: boolean;
  isActive?: boolean;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

export type UpsertRoleInput = {
  name: UserRole;
  displayName: string;
  description: string;
  permissions: string[];
  isSystem?: boolean;
  isActive?: boolean;
};
