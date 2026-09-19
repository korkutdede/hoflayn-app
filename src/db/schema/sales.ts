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
import { tenants, users } from "./core";
import { products } from "./products";
import { stockMovements } from "./stock-movements";

/**
 * Sales ledger (Loop 22). Money in integer minor units (kuruş).
 * Stock deduction uses stock_movements (out) linked per line.
 */
export const saleSourceEnum = pgEnum("sale_source", [
  "manual",
  "csv",
  "hoflayn_web",
]);

export const saleStatusEnum = pgEnum("sale_status", [
  "completed",
  "voided",
]);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    source: saleSourceEnum("source").notNull().default("manual"),
    status: saleStatusEnum("status").notNull().default("completed"),
    currency: text("currency").notNull().default("TRY"),
    totalMinor: integer("total_minor").notNull().default(0),
    note: text("note"),
    soldAt: timestamp("sold_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    idempotencyKey: text("idempotency_key"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("sales_tenant_sold_idx").on(t.tenantId, t.soldAt),
    uniqueIndex("sales_tenant_idempotency_uq").on(t.tenantId, t.idempotencyKey),
  ],
);

export const saleLines = pgTable(
  "sale_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPriceMinor: integer("unit_price_minor").notNull(),
    lineTotalMinor: integer("line_total_minor").notNull(),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    stockMovementId: uuid("stock_movement_id").references(
      () => stockMovements.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("sale_lines_sale_idx").on(t.saleId),
    index("sale_lines_tenant_idx").on(t.tenantId),
    index("sale_lines_product_idx").on(t.productId),
  ],
);
