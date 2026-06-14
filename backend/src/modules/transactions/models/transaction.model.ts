import { Schema, model, type InferSchemaType } from "mongoose";

export const TRANSACTION_TYPES = [
  "deposit",
  "withdrawal",
  "reward",
  "adjustment",
  "plan_purchase",
] as const;
export const TRANSACTION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "completed",
  "failed",
] as const;

const transactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: TRANSACTION_STATUSES,
      default: "pending",
      index: true,
    },
    amountUsdt: {
      type: Number,
      required: true,
      min: 0,
    },
    txnHash: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      default: function (this: any) {
        return `SYS-${this._id.toString().toUpperCase()}`;
      },
    },
    network: {
      type: String,
      default: "BEP20",
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    payoutKind: {
      type: String,
      enum: ["weekly", "level", "salary_royalty"],
      default: null,
      index: true,
    },
    payoutLevel: {
      type: Number,
      min: 1,
      default: null,
    },
    payoutSourceTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
      index: true,
    },
    payoutSourceUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    payoutPeriodStart: {
      type: Date,
      default: null,
      index: true,
    },
    payoutPeriodEnd: {
      type: Date,
      default: null,
      index: true,
    },
    payoutTier: {
      type: String,
      trim: true,
      default: null,
    },
    payoutPercent: {
      type: Number,
      min: 0,
      default: null,
    },
    payoutPrincipalUsdt: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, type: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index(
  { userId: 1, type: 1, payoutKind: 1, payoutPeriodStart: 1, payoutPeriodEnd: 1 },
  {
    partialFilterExpression: { payoutKind: "weekly", type: "reward" },
    unique: true,
  },
);
transactionSchema.index(
  { userId: 1, type: 1, payoutKind: 1, payoutSourceTransactionId: 1 },
  {
    partialFilterExpression: { payoutKind: "level", type: "reward" },
    unique: true,
  },
);
transactionSchema.index(
  {
    userId: 1,
    type: 1,
    payoutKind: 1,
    payoutTier: 1,
    payoutPeriodStart: 1,
    payoutPeriodEnd: 1,
  },
  {
    partialFilterExpression: { payoutKind: "salary_royalty", type: "reward" },
    unique: true,
  },
);

export type TransactionDocument = InferSchemaType<typeof transactionSchema>;
export const TransactionModel = model("Transaction", transactionSchema);
