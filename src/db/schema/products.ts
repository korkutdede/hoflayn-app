import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { mediaAssets } from "./media";

/**
 * Tenant-local product catalog (SaaS source of truth).
 * Marketplace sync links are added in Stage 6 — keep this free of Hoflayn Web IDs.
 */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    descriptionAiGenerated: boolean("description_ai_generated")
      .notNull()
      .default(false),
    price: numeric("price", { precision: 10, scale: 2 }),
    costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    /** null → tenant.default_low_stock_threshold */
    lowStockThreshold: integer("low_stock_threshold"),
    category: text("category"),
    /** Comma-separated tags for Stage 5 simplicity (array later if needed). */
    tags: text("tags"),
    coverImageId: uuid("cover_image_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    lengthCm: numeric("length_cm", { precision: 8, scale: 2 }),
    widthCm: numeric("width_cm", { precision: 8, scale: 2 }),
    heightCm: numeric("height_cm", { precision: 8, scale: 2 }),
    weightKg: numeric("weight_kg", { precision: 8, scale: 3 }),
    seoTitle: text("seo_title"),
    seoMetaDescription: text("seo_meta_description"),
    seoSlug: text("seo_slug"),
    seoPrimaryKeyword: text("seo_primary_keyword"),
    /** Comma-separated secondary keywords. */
    seoSecondaryKeywords: text("seo_secondary_keywords"),
    seoChannel: text("seo_channel"),
    seoAppliedAt: timestamp("seo_applied_at", { withTimezone: true }),
    /** Internal workshop SKU (not necessarily GS1). */
    sku: text("sku"),
    /** Encoded barcode payload; defaults to sku when empty. */
    barcodeValue: text("barcode_value"),
    /** code128 | qr | gs1_128 */
    barcodeFormat: text("barcode_format").default("code128"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("products_tenant_created_idx").on(t.tenantId, t.createdAt),
    index("products_tenant_name_idx").on(t.tenantId, t.name),
    index("products_tenant_sku_idx").on(t.tenantId, t.sku),
  ],
);
