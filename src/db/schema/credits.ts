import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";

/**
 * Credit ledger (P5). Append-only financial record; rows are never deleted.
 * `tenants.credit_balance` is a denormalized cache updated in the same
 * transaction as each insert. `balanceAfter` snapshots the balance for audit.
 */

export const creditTxnType = pgEnum("credit_txn_type", [
  "free_grant",
  "purchase",
  "subscription_grant",
  "usage",
  "refund",
  "bonus",
  "adjustment",
]);

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** Positive = grant/refund, negative = usage. */
    amount: integer("amount").notNull(),
    type: creditTxnType("type").notNull(),
    /** Tenant balance immediately after applying this transaction. */
    balanceAfter: integer("balance_after").notNull(),
    description: text("description"),
    /** Loose link to the entity that caused the transaction, e.g. "ai_job". */
    relatedType: text("related_type"),
    relatedId: uuid("related_id"),
    /** Optional caller key that makes financial mutations replay-safe. */
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("credit_txn_tenant_created_idx").on(t.tenantId, t.createdAt),
    uniqueIndex("credit_txn_tenant_idempotency_uq").on(
      t.tenantId,
      t.idempotencyKey,
    ),
  ],
);
