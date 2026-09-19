import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Core identity & tenancy.
 *
 * Design (ADR-010): identity is separate from tenancy. A `user` maps 1:1 to a
 * Supabase Auth user (same id). Access to a `tenant` (a workshop/atelier) is
 * granted through `memberships`, so a single user can belong to multiple
 * tenants and a tenant can have multiple members later without a schema change.
 */

export const membershipRole = pgEnum("membership_role", [
  "owner",
  "admin",
  "member",
]);

/** Mirrors auth.users. `id` equals the Supabase Auth user id. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // == auth.users.id
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  /** UI language ("tr" | "en"); null = negotiate from the request. */
  locale: text("locale"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** A workshop/atelier. The unit of tenant isolation. */
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** ceramics | candle | wood | epoxy | textile | other — free text, validated in app layer. */
  craftCategory: text("craft_category"),
  logoUrl: text("logo_url"),
  /**
   * Language for AI-generated content (descriptions, captions, SEO).
   * Independent of the UI locale: an English-speaking maker can still be
   * selling into the Turkish market.
   */
  contentLocale: text("content_locale").notNull().default("tr"),
  /**
   * ISO 4217 code the workshop prices in. Products store a bare `price`, so
   * this is what gives that number a unit. Independent of both locales: the
   * currency follows the market, not the language.
   */
  currency: text("currency").notNull().default("TRY"),
  /** Denormalized running balance; source of truth is credit_transactions. */
  creditBalance: integer("credit_balance").notNull().default(0),
  /**
   * Default low-stock alert threshold (Loop 24).
   * Product override: products.low_stock_threshold (null = use this).
   */
  defaultLowStockThreshold: integer("default_low_stock_threshold")
    .notNull()
    .default(5),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Many-to-many link between users and tenants, carrying the role. */
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("memberships_user_tenant_uq").on(t.userId, t.tenantId)],
);
