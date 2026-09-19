import { z } from "zod";

export const stockMovementTypeSchema = z.enum([
  "in",
  "out",
  "adjust",
  "reserve",
]);

export const createStockMovementSchema = z.object({
  type: stockMovementTypeSchema,
  /** in/out/reserve: units; adjust: absolute on-hand target. */
  quantity: z.coerce.number().int().min(0),
  note: z.string().trim().max(400).optional().default(""),
  allowNegative: z.boolean().optional().default(false),
  relatedType: z.string().trim().max(80).optional().nullable().default(null),
  relatedId: z.string().trim().max(120).optional().nullable().default(null),
  idempotencyKey: z.string().trim().min(8).max(120).optional().nullable(),
});
