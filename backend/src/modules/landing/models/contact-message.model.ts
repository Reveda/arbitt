import { Schema, model, type InferSchemaType } from "mongoose";

const contactMessageSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "read"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

export type ContactMessageDocument = InferSchemaType<typeof contactMessageSchema>;
export const ContactMessageModel = model("ContactMessage", contactMessageSchema);
