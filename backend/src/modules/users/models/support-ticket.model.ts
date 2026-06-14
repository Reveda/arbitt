import { Schema, model, type InferSchemaType } from "mongoose";

const supportTicketSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
      enum: ["pending", "resolved"],
      default: "pending",
      index: true,
    },
    reply: {
      type: String,
      default: null,
      trim: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export type SupportTicketDocument = InferSchemaType<typeof supportTicketSchema>;
export const SupportTicketModel = model("SupportTicket", supportTicketSchema);
