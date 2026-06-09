import { Schema, model, type InferSchemaType } from "mongoose";

const referralSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    parentUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    path: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    directCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    activeTeamCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

referralSchema.index({ parentUserId: 1, createdAt: -1 });

export type ReferralDocument = InferSchemaType<typeof referralSchema>;
export const ReferralModel = model("Referral", referralSchema);
