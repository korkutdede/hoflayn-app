import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";

export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "unpaid",
]);

export const billingCustomers = pgTable(
  "billing_customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("stripe"),
    customerId: text("customer_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("billing_customers_tenant_provider_uq").on(
      t.tenantId,
      t.provider,
    ),
    uniqueIndex("billing_customers_provider_customer_uq").on(
      t.provider,
      t.customerId,
    ),
  ],
);

/**
 * Billing provider state. Provider identifiers are references, not secrets.
 * A tenant has at most one current subscription row in Stage 4.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("stripe"),
    customerId: text("customer_id").notNull(),
    subscriptionId: text("subscription_id").notNull(),
    priceId: text("price_id"),
    status: subscriptionStatus("status").notNull(),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("subscriptions_tenant_provider_uq").on(t.tenantId, t.provider),
    uniqueIndex("subscriptions_provider_subscription_uq").on(
      t.provider,
      t.subscriptionId,
    ),
  ],
);

/**
 * Webhook inbox/idempotency ledger. A provider event is applied at most once.
 */
export const billingEvents = pgTable(
  "billing_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    externalEventId: text("external_event_id").notNull(),
    eventType: text("event_type").notNull(),
    status: text("status").notNull().default("processing"),
    error: text("error"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("billing_events_provider_external_uq").on(
      t.provider,
      t.externalEventId,
    ),
  ],
);
