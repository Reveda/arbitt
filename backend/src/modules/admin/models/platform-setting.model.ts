import { Schema, model, type InferSchemaType } from "mongoose";

const platformSettingSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      default: {},
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export type PlatformSettingDocument = InferSchemaType<typeof platformSettingSchema>;
export const PlatformSettingModel = model("PlatformSetting", platformSettingSchema);
