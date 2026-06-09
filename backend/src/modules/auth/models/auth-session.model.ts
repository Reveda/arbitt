import { Schema, model, type InferSchemaType } from "mongoose";

const authSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },
    previousRefreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    previousTokenVersion: {
      type: Number,
      default: null,
    },
    previousTokenRotatedAt: {
      type: Date,
      default: null,
    },
    tokenVersion: {
      type: Number,
      default: 1,
      min: 1,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

authSessionSchema.index({ userId: 1, revokedAt: 1 });

export type AuthSessionDocument = InferSchemaType<typeof authSessionSchema>;
export const AuthSessionModel = model("AuthSession", authSessionSchema);
