import { Schema, model, type InferSchemaType } from "mongoose";

export const ANNOUNCEMENT_TYPES = ["info", "warning", "alert", "update"] as const;

const announcementSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ANNOUNCEMENT_TYPES,
      required: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      default: "System Admin",
    },
  },
  {
    timestamps: true,
  }
);

export type AnnouncementDocument = InferSchemaType<typeof announcementSchema>;
export const AnnouncementModel = model("Announcement", announcementSchema);
