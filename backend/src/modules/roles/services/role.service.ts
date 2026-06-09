import { roleRepository } from "../repositories/role.repository";
import type { UserRole } from "../../../constants/roles";
import type { ListRolesResponseDto, RoleDto } from "../dtos/role.dto";

export const DEFAULT_ROLES = [
  {
    name: "user" as const,
    displayName: "User",
    description: "Standard platform user with wallet, referral, and dashboard access.",
    permissions: [
      "dashboard:read",
      "profile:read",
      "profile:update",
      "wallet:read",
      "wallet:deposit:create",
      "wallet:withdrawal:create",
      "plans:purchase",
      "payments:intents:manage",
      "referrals:read",
      "transactions:read",
      "notifications:read",
    ],
  },
  {
    name: "admin" as const,
    displayName: "Admin",
    description: "Platform administrator with management and review access.",
    permissions: [
      "dashboard:read",
      "profile:read",
      "wallet:read",
      "referrals:read",
      "transactions:read",
      "notifications:read",
      "admin:overview:read",
      "admin:users:manage",
      "admin:plans:manage",
      "admin:deposits:review",
      "admin:withdrawals:review",
      "admin:settings:manage",
    ],
  },
  {
    name: "super_admin" as const,
    displayName: "Super Admin",
    description:
      "Top-level operator for audit logs, admin governance, corrections, and platform settings.",
    permissions: [
      "dashboard:read",
      "profile:read",
      "wallet:read",
      "referrals:read",
      "transactions:read",
      "notifications:read",
      "admin:overview:read",
      "admin:users:manage",
      "admin:plans:manage",
      "admin:deposits:review",
      "admin:withdrawals:review",
      "admin:settings:manage",
      "super_admin:admins:manage",
      "super_admin:audit_logs:read",
      "super_admin:corrections:manage",
      "super_admin:platform_settings:manage",
      "super_admin:security:manage",
    ],
  },
];

export class RoleService {
  private toRoleDto(role: {
    _id?: unknown;
    name?: UserRole;
    displayName?: string;
    description?: string;
    permissions?: string[];
    isSystem?: boolean;
    isActive?: boolean;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
  }): RoleDto {
    return {
      id: String(role._id),
      name: role.name ?? "user",
      displayName: role.displayName ?? "",
      description: role.description ?? "",
      permissions: role.permissions ?? [],
      isSystem: role.isSystem !== false,
      isActive: role.isActive !== false,
      createdAt: role.createdAt ?? null,
      updatedAt: role.updatedAt ?? null,
    };
  }

  async seedDefaultRoles(): Promise<ListRolesResponseDto> {
    const roles = await Promise.all(DEFAULT_ROLES.map((role) => roleRepository.upsertRole(role)));
    return { roles: roles.map((role) => this.toRoleDto(role)) };
  }

  async listRoles(): Promise<ListRolesResponseDto> {
    const roles = await roleRepository.listActive();
    return { roles: roles.map((role) => this.toRoleDto(role)) };
  }
}

export const roleService = new RoleService();
