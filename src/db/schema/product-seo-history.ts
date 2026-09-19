import {
  pgTable,
  pgEnum,
  uuid,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { products } from "./products";
import { aiJobs } from "./ai-jobs";

export const seoChannelEnum = pgEnum("seo_channel", [
  "generic_web",
  "hoflayn_web",
]);

/**
 * Product SEO suggestion / apply history (Loop 18).
 * Generations may exist without apply; applied rows set applied_at + applied_fields.
 */
export const productSeoHistory = pgTable(
  "product_seo_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => aiJobs.id, {
      onDelete: "set null",
    }),
    channel: seoChannelEnum("channel").notNull(),
    suggestion: jsonb("suggestion").$type<Record<string, unknown>>().notNull(),
    audit: jsonb("audit").$type<Record<string, unknown>>().notNull(),
    appliedFields: jsonb("applied_fields").$type<Record<
      string,
      boolean
    > | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
  },
  (t) => [
    index("product_seo_history_product_created_idx").on(
      t.productId,
      t.createdAt,
    ),
    index("product_seo_history_tenant_created_idx").on(t.tenantId, t.createdAt),
  ],
);
