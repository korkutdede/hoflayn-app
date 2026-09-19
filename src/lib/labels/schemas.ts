import { z } from "zod";
import {
  MAX_LABEL_COPIES,
  MAX_LABEL_PRODUCTS,
} from "./constants";

export const labelSizeSchema = z.enum(["50x30", "62x29", "100x50"]);
export const labelBarcodeFormatSchema = z.enum(["code128", "qr", "gs1_128"]);

export const createLabelExportSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(MAX_LABEL_PRODUCTS),
  size: labelSizeSchema.optional().default("50x30"),
  format: labelBarcodeFormatSchema.optional().default("code128"),
  copies: z.coerce.number().int().min(1).max(MAX_LABEL_COPIES).optional().default(1),
  showPrice: z.boolean().optional().default(true),
  showName: z.boolean().optional().default(true),
  idempotencyKey: z.string().trim().min(8).max(120),
});
