import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";

/**
 * Entitlements (P2): flag = access right, credit = usage right.
 *
 * `plans` is a small catalog. `tenant_entitlements` holds the resolved access
 * for a tenant: which plan, per-module toggles/limits (jsonb overrides), and an
 * optional expiry. This is intentionally simple; a full flag engine is deferred
 * until it is actually needed (see architecture notes).
 */

export const plans = pgTable("plans", {
  id: text("id").primaryKey(), // "free" | "starter" | "pro" | "enterprise"
  name: text("name").notNull(),
  monthlyCredits: integer("monthly_credits").notNull().default(0),
  priceCents: integer("price_cents").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  /** Default module access & limits for this plan. */
  defaults: jsonb("defaults").$type<PlanDefaults>().notNull().default({}),
});

export type PlanDefaults = {
  modules?: Record<string, boolean>;
  limits?: Record<string, number>;
};

export const tenantEntitlements = pgTable("tenant_entitlements", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  plan: text("plan")
    .notNull()
    .default("free")
    .references(() => plans.id),
  /** Per-tenant overrides on top of the plan defaults. */
  modules: jsonb("modules").$type<Record<string, boolean>>().notNull().default({}),
  limits: jsonb("limits").$type<Record<string, number>>().notNull().default({}),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
