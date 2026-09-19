import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { products } from "./products";

/**
 * Generic export/sync link to an external catalog (Hoflayn Web is one provider).
 * SaaS product remains source of truth; this row tracks outbound state only.
 */
export const syncProvider = pgEnum("sync_provider", ["hoflayn_web"]);

export const syncStatus = pgEnum("sync_status", [
  "draft",
  "pending",
  "published",
  "rejected",
  "failed",
  "archived",
]);

export const syncLinks = pgTable(
  "sync_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    provider: syncProvider("provider").notNull().default("hoflayn_web"),
    /** External marketplace product id once accepted. */
    externalId: text("external_id"),
    /** Public marketplace URL when the PHP side can provide one. */
    externalUrl: text("external_url"),
    status: syncStatus("status").notNull().default("draft"),
    /** Last lifecycle action attempted against the provider. */
    lastOperation: text("last_operation"),
    /** HTTP status returned by the provider, if a request was made. */
    lastResponseStatus: integer("last_response_status"),
    /** Human-readable rejection reason returned by marketplace moderation. */
    rejectionReason: text("rejection_reason"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastError: text("last_error"),
    /** SHA-256 of the last attempted stable outbound payload. */
    payloadHash: text("payload_hash"),
    /** SHA-256 of the last payload acknowledged by the provider. */
    successfulPayloadHash: text("successful_payload_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("sync_links_provider_product_uq").on(t.provider, t.productId),
    index("sync_links_tenant_status_idx").on(t.tenantId, t.status),
  ],
);
