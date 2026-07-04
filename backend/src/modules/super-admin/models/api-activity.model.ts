import { Schema, model, type InferSchemaType } from "mongoose";
import { env } from "../../../config/env";
import { USER_ROLES } from "../../../constants/roles";

const apiActivitySchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    durationMs: {
      type: Number,
      required: true,
      min: 0,
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true,
    },
    method: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    routeGroup: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    statusCode: {
      type: Number,
      required: true,
      index: true,
    },
    success: {
      type: Boolean,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    userRole: {
      type: String,
      enum: USER_ROLES,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

apiActivitySchema.index({ createdAt: -1 });
apiActivitySchema.index({ routeGroup: 1, createdAt: -1 });
apiActivitySchema.index({ statusCode: 1, createdAt: -1 });
apiActivitySchema.index({ success: 1, createdAt: -1 });
apiActivitySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * env.API_ACTIVITY_RETENTION_DAYS },
);

export type ApiActivityDocument = InferSchemaType<typeof apiActivitySchema>;
export const ApiActivityModel = model("ApiActivity", apiActivitySchema);
