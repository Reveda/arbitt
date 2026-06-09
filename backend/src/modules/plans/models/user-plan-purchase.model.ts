import { Schema, model, type InferSchemaType } from "mongoose";

export const USER_PLAN_PURCHASE_STATUSES = ["active", "completed", "cancelled"] as const;

const userPlanPurchaseSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sourceTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
      unique: true,
      index: true,
    },
    tier: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amountUsdt: {
      type: Number,
      required: true,
      min: 0,
    },
    weeklyReturnPercent: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: USER_PLAN_PURCHASE_STATUSES,
      default: "active",
      index: true,
    },
    purchasedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

userPlanPurchaseSchema.index({ userId: 1, status: 1, purchasedAt: -1 });

export type UserPlanPurchaseDocument = InferSchemaType<typeof userPlanPurchaseSchema>;
export const UserPlanPurchaseModel = model("UserPlanPurchase", userPlanPurchaseSchema);
