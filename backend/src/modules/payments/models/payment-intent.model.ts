import { Schema, model, type InferSchemaType } from "mongoose";
import { PAYMENT_NETWORKS } from "../constants/payment-networks";

export const PAYMENT_INTENT_TYPES = ["plan_purchase", "wallet_deposit"] as const;
export const PAYMENT_INTENT_STATUSES = [
  "pending",
  "detected",
  "completed",
  "expired",
  "failed",
  "ambiguous",
] as const;

const paymentIntentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: PAYMENT_INTENT_TYPES,
      default: "plan_purchase",
      index: true,
    },
    status: {
      type: String,
      enum: PAYMENT_INTENT_STATUSES,
      default: "pending",
      index: true,
    },
    tier: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    planName: {
      type: String,
      required: true,
      trim: true,
    },
    weeklyReturnPercent: {
      type: Number,
      required: true,
      min: 0,
    },
    amountUsdt: {
      type: Number,
      required: true,
      min: 0,
    },
    amountTokenUnits: {
      type: String,
      required: true,
      trim: true,
    },
    network: {
      type: String,
      enum: PAYMENT_NETWORKS,
      required: true,
      index: true,
    },
    chainId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    chainName: {
      type: String,
      required: true,
      trim: true,
    },
    gasToken: {
      type: String,
      required: true,
      trim: true,
    },
    tokenSymbol: {
      type: String,
      required: true,
      trim: true,
      default: "USDT",
    },
    tokenContract: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    tokenDecimals: {
      type: Number,
      required: true,
      min: 0,
    },
    receiverAddress: {
      type: String,
      required: true,
      trim: true,
    },
    receiverAddressNormalized: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    senderAddress: {
      type: String,
      trim: true,
      default: null,
    },
    senderAddressNormalized: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    txnHash: {
      type: String,
      trim: true,
      default: null,
    },
    txnHashNormalized: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      index: true,
    },
    logIndex: {
      type: String,
      trim: true,
      default: null,
    },
    sourceTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    detectedAt: {
      type: Date,
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      trim: true,
      default: null,
    },
    webhookMetadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

paymentIntentSchema.index({ userId: 1, createdAt: -1 });
paymentIntentSchema.index({ status: 1, expiresAt: 1 });
paymentIntentSchema.index({
  amountTokenUnits: 1,
  chainId: 1,
  receiverAddressNormalized: 1,
  status: 1,
  tokenContract: 1,
});
paymentIntentSchema.index(
  { txnHashNormalized: 1, logIndex: 1 },
  {
    partialFilterExpression: { txnHashNormalized: { $type: "string" } },
    unique: true,
  },
);

export type PaymentIntentDocument = InferSchemaType<typeof paymentIntentSchema>;
export const PaymentIntentModel = model("PaymentIntent", paymentIntentSchema);
