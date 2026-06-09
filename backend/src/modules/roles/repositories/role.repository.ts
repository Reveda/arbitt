import type { UserRole } from "../../../constants/roles";
import { RoleModel } from "../models/role.model";
import type { RoleRepositoryRecord, UpsertRoleInput } from "../types/role.repository.types";

export class RoleRepository {
  async findByName(name: UserRole): Promise<RoleRepositoryRecord | null> {
    return RoleModel.findOne({ name }).lean();
  }

  async listActive(): Promise<RoleRepositoryRecord[]> {
    return RoleModel.find({ isActive: true }).sort({ name: 1 }).lean();
  }

  async upsertRole(input: UpsertRoleInput): Promise<RoleRepositoryRecord> {
    return RoleModel.findOneAndUpdate(
      { name: input.name },
      {
        $set: {
          displayName: input.displayName,
          description: input.description,
          permissions: input.permissions,
          isSystem: input.isSystem ?? true,
          isActive: input.isActive ?? true,
        },
      },
      { upsert: true, new: true },
    ).lean() as Promise<RoleRepositoryRecord>;
  }
}

export const roleRepository = new RoleRepository();
