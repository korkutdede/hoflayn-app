import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";

/**
 * Media assets. Rows are metadata only; bytes live in Supabase Storage under
 * a tenant-prefixed path. `ttlAt` drives lifecycle cleanup (temp/exports).
 */

export const mediaKind = pgEnum("media_kind", [
  "upload",
  "processed",
  "ai_generated",
  "export",
]);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    kind: mediaKind("kind").notNull(),
    bucket: text("bucket").notNull(),
    /** Path within the bucket, always tenant-prefixed: `{tenantId}/...`. */
    path: text("path").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    width: integer("width"),
    height: integer("height"),
    /** When set, asset is eligible for automatic deletion after this time. */
    ttlAt: timestamp("ttl_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("media_tenant_created_idx").on(t.tenantId, t.createdAt)],
);
