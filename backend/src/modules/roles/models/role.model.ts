import { Schema, model, type InferSchemaType } from "mongoose";
import { USER_ROLES } from "../../../constants/roles";

export const ROLE_PERMISSIONS = [
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
] as const;

const roleSchema = new Schema(
  {
    name: {
      type: String,
      enum: USER_ROLES,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    permissions: [
      {
        type: String,
        enum: ROLE_PERMISSIONS,
        required: true,
      },
    ],
    isSystem: {
      type: Boolean,
      default: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export type RoleDocument = InferSchemaType<typeof roleSchema>;
export const RoleModel = model("Role", roleSchema);
