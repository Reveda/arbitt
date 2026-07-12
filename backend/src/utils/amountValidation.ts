import { z } from "zod";

export function usdtAmount(options: { min?: number; max?: number; minMessage?: string; maxMessage?: string } = {}) {
  const decimalPlaces = 18;
  const scale = 10n ** BigInt(decimalPlaces);
  const toUnits = (value: string) => {
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole) * scale + BigInt((fraction + "0".repeat(decimalPlaces)).slice(0, decimalPlaces));
  };
  let schema: z.ZodType<string> = z
    .string({ invalid_type_error: "Amount must be a valid decimal string." })
    .trim()
    .regex(/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/, "Amount must be a valid USDT value with up to 18 decimals.")
    .refine((value) => toUnits(value) > 0n, "Amount must be greater than 0.");

  if (options.min !== undefined) {
    schema = schema.refine((value) => toUnits(value) >= BigInt(Math.round(options.min! * Number(scale))), options.minMessage ?? `Amount must be at least ${options.min}.`);
  }
  if (options.max !== undefined) {
    schema = schema.refine((value) => toUnits(value) <= BigInt(Math.round(options.max! * Number(scale))), options.maxMessage ?? `Amount must not exceed ${options.max}.`);
  }

  return z.preprocess((value) => typeof value === "number" && Number.isFinite(value) ? String(value) : value, schema);
}
