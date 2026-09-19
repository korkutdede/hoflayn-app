import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants, users } from "./core";

/**
 * AI job backbone (P4 + P5). Every AI operation is an async job so it can be
 * queued, retried, circuit-broken, and cost-tracked independently of the HTTP
 * request. Cost accounting (usage logs) is kept separate from credit accounting.
 */

export const aiJobStatus = pgEnum("ai_job_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
  "canceled",
  "retry_later",
  "dead_letter",
]);

export const aiJobs = pgTable(
  "ai_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Module that owns the job, e.g. "studio", "writer". */
    module: text("module").notNull(),
    /** Operation within the module, e.g. "remove_bg", "white_bg". */
    operation: text("operation").notNull(),
    status: aiJobStatus("status").notNull().default("pending"),
    provider: text("provider"),
    creditsReserved: integer("credits_reserved").notNull().default(0),
    creditsCharged: integer("credits_charged").notNull().default(0),
    input: jsonb("input").$type<Record<string, unknown>>(),
    output: jsonb("output").$type<Record<string, unknown>>(),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockToken: uuid("lock_token"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    index("ai_jobs_tenant_created_idx").on(t.tenantId, t.createdAt),
    index("ai_jobs_status_idx").on(t.status),
    index("ai_jobs_queue_idx").on(t.status, t.nextAttemptAt, t.createdAt),
  ],
);

/** Per-call provider cost log. Feeds cost dashboards and hard limits. */
export const aiUsageLogs = pgTable(
  "ai_usage_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    aiJobId: uuid("ai_job_id").references(() => aiJobs.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull(),
    model: text("model"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 5 })
      .notNull()
      .default("0"),
    latencyMs: integer("latency_ms"),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("ai_usage_tenant_created_idx").on(t.tenantId, t.createdAt),
    uniqueIndex("ai_usage_tenant_idempotency_uq").on(
      t.tenantId,
      t.idempotencyKey,
    ),
  ],
);
