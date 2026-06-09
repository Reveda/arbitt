import { Schema, model, type InferSchemaType } from "mongoose";

const planSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    priceUsdt: {
      type: Number,
      required: true,
      min: 0,
    },
    validityDays: {
      type: Number,
      required: true,
      min: 1,
    },
    dailyReturnPercent: {
      type: Number,
      required: true,
      min: 0,
    },
    totalReturnPercent: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export type PlanDocument = InferSchemaType<typeof planSchema>;
export const PlanModel = model("Plan", planSchema);
