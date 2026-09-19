import {
  pgTable,
  pgEnum,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { products } from "./products";

export const toolScenarioKind = pgEnum("tool_scenario_kind", ["desi", "profit"]);

export const toolScenarios = pgTable(
  "tool_scenarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    kind: toolScenarioKind("kind").notNull(),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("TRY"),
    inputs: jsonb("inputs").$type<Record<string, unknown>>().notNull(),
    results: jsonb("results").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("tool_scenarios_tenant_updated_idx").on(t.tenantId, t.updatedAt),
    index("tool_scenarios_tenant_kind_idx").on(t.tenantId, t.kind),
  ],
);
