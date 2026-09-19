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

export const catalogTemplateEnum = pgEnum("catalog_template", [
  "grid",
  "lookbook",
]);

export const catalogThemeEnum = pgEnum("catalog_theme", ["linen", "ink"]);

export const catalogExportStatusEnum = pgEnum("catalog_export_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const catalogs = pgTable(
  "catalogs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    templateId: catalogTemplateEnum("template_id").notNull().default("grid"),
    theme: catalogThemeEnum("theme").notNull().default("linen"),
    showPrices: boolean("show_prices").notNull().default(true),
    showWorkshop: boolean("show_workshop").notNull().default(true),
    coverProductId: uuid("cover_product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    workshopSnapshot: jsonb("workshop_snapshot")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("catalogs_tenant_updated_idx").on(t.tenantId, t.updatedAt)],
);

export const catalogItems = pgTable(
  "catalog_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    catalogId: uuid("catalog_id")
      .notNull()
      .references(() => catalogs.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    /** Snapshot at add/generate time for stable PDF layout. */
    nameSnapshot: text("name_snapshot").notNull(),
    descriptionSnapshot: text("description_snapshot"),
    priceSnapshot: text("price_snapshot"),
    coverPathSnapshot: text("cover_path_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("catalog_items_catalog_product_uq").on(t.catalogId, t.productId),
    index("catalog_items_catalog_sort_idx").on(t.catalogId, t.sortOrder),
    index("catalog_items_tenant_idx").on(t.tenantId),
  ],
);

export const catalogExports = pgTable(
  "catalog_exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    catalogId: uuid("catalog_id")
      .notNull()
      .references(() => catalogs.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => aiJobs.id, {
      onDelete: "set null",
    }),
    mediaAssetId: uuid("media_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    status: catalogExportStatusEnum("status").notNull().default("pending"),
    idempotencyKey: text("idempotency_key").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("catalog_exports_tenant_idempotency_uq").on(
      t.tenantId,
      t.idempotencyKey,
    ),
    index("catalog_exports_catalog_created_idx").on(t.catalogId, t.createdAt),
    index("catalog_exports_tenant_created_idx").on(t.tenantId, t.createdAt),
  ],
);
