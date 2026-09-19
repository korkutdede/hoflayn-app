import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants, users } from "./core";
import { products } from "./products";

/**
 * Append-only stock ledger (Loop 21).
 * `products.stock_quantity` is updated in the same transaction as each insert.
 */
export const stockMovementType = pgEnum("stock_movement_type", [
  "in",
  "out",
  "adjust",
  "reserve",
]);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: stockMovementType("type").notNull(),
    /** Signed delta applied to stock (+in, −out/−reserve, adjust delta). */
    quantity: integer("quantity").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    note: text("note"),
    relatedType: text("related_type"),
    relatedId: text("related_id"),
    allowNegative: boolean("allow_negative").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("stock_movements_product_created_idx").on(
      t.productId,
      t.createdAt,
    ),
    index("stock_movements_tenant_created_idx").on(t.tenantId, t.createdAt),
    uniqueIndex("stock_movements_tenant_idempotency_uq").on(
      t.tenantId,
      t.idempotencyKey,
    ),
  ],
);
