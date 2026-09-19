import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { products } from "./products";
import { aiJobs } from "./ai-jobs";
import { mediaAssets } from "./media";

export const labelSizeEnum = pgEnum("label_size", [
  "50x30",
  "62x29",
  "100x50",
]);

export const labelBarcodeFormatEnum = pgEnum("label_barcode_format", [
  "code128",
  "qr",
  "gs1_128",
]);

export const labelExportStatusEnum = pgEnum("label_export_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const labelExports = pgTable(
  "label_exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => aiJobs.id, {
      onDelete: "set null",
    }),
    mediaAssetId: uuid("media_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    status: labelExportStatusEnum("status").notNull().default("pending"),
    size: labelSizeEnum("size").notNull().default("50x30"),
    format: labelBarcodeFormatEnum("format").notNull().default("code128"),
    copies: integer("copies").notNull().default(1),
    showPrice: boolean("show_price").notNull().default(true),
    showName: boolean("show_name").notNull().default(true),
    idempotencyKey: text("idempotency_key").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("label_exports_tenant_idempotency_uq").on(
      t.tenantId,
      t.idempotencyKey,
    ),
    index("label_exports_tenant_created_idx").on(t.tenantId, t.createdAt),
  ],
);

export const labelExportItems = pgTable(
  "label_export_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    exportId: uuid("export_id")
      .notNull()
      .references(() => labelExports.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    nameSnapshot: text("name_snapshot").notNull(),
    priceSnapshot: text("price_snapshot"),
    skuSnapshot: text("sku_snapshot"),
    barcodeValueSnapshot: text("barcode_value_snapshot").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("label_export_items_export_sort_idx").on(t.exportId, t.sortOrder),
    index("label_export_items_tenant_idx").on(t.tenantId),
  ],
);
