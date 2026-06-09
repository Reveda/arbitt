import { Schema, model, type InferSchemaType } from "mongoose";

const walletSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    availableUsdt: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedUsdt: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeDepositsUsdt: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeWithdrawalsUsdt: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeRewardsUsdt: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

export type WalletDocument = InferSchemaType<typeof walletSchema>;
export const WalletModel = model("Wallet", walletSchema);
