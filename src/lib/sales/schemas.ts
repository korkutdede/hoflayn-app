import { z } from "zod";

export const saleSourceSchema = z.enum(["manual", "csv", "hoflayn_web"]);

export const saleLineInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  /** Major units string e.g. "120.50" — converted to minor. */
  unitPrice: z.string().trim().min(1).max(20),
});

export const createSaleSchema = z.object({
  source: saleSourceSchema.optional().default("manual"),
  note: z.string().trim().max(400).optional().default(""),
  soldAt: z.string().datetime().optional().nullable(),
  currency: z.string().trim().length(3).optional().default("TRY"),
  allowNegativeStock: z.boolean().optional().default(false),
  idempotencyKey: z.string().trim().min(8).max(120).optional().nullable(),
  lines: z.array(saleLineInputSchema).min(1).max(100),
});

export const voidSaleSchema = z.object({
  note: z.string().trim().max(400).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(120).optional().nullable(),
});
