import { z } from "zod";
import { MAX_CATALOG_ITEMS } from "./constants";

export const catalogTemplateSchema = z.enum(["grid", "lookbook"]);
export const catalogThemeSchema = z.enum(["linen", "ink"]);

export const createCatalogSchema = z.object({
  title: z.string().trim().min(2).max(120),
  templateId: catalogTemplateSchema.optional().default("grid"),
  theme: catalogThemeSchema.optional().default("linen"),
  showPrices: z.boolean().optional().default(true),
  showWorkshop: z.boolean().optional().default(true),
  coverProductId: z.string().uuid().nullable().optional().default(null),
  productIds: z.array(z.string().uuid()).min(1).max(MAX_CATALOG_ITEMS),
});

export const exportCatalogSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120),
});
