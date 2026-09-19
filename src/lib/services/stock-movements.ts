import "server-only";
import { LocalizedError } from "@/lib/i18n/error";
import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { products, stockMovements } from "@/db/schema";
import type { TenantContext } from "@/lib/auth/session";
import {
  assertStockAllowed,
  computeStockDelta,
  InsufficientStockError,
} from "@/lib/stock/policy";
import { createStockMovementSchema } from "@/lib/stock/schemas";
import { evaluateLowStockForProducts } from "@/lib/services/low-stock";
import { getTranslator } from "@/lib/i18n/server";
import { stockMovementCause } from "@/lib/stock/related-labels";
import { logFunnel } from "@/lib/observability/log";
import type { Translator } from "@hoflayn/i18n";
import type { z } from "zod";

export { createStockMovementSchema, InsufficientStockError };

export type DbOrTx = PostgresJsDatabase<typeof schema>;
type MovementInput = z.infer<typeof createStockMovementSchema>;

/**
 * `note` is user-authored. Movements the system creates (a sale, a void, a
 * draft reservation) leave it null and carry `relatedType` instead, so the
 * prose is generated per request in the reader's language rather than frozen
 * into the row in whatever language the seller happened to be using.
 */
function serialize(
  row: typeof stockMovements.$inferSelect,
  t: Translator,
) {
  return {
    id: row.id,
    productId: row.productId,
    type: row.type,
    quantity: row.quantity,
    balanceAfter: row.balanceAfter,
    note: row.note ?? stockMovementCause(row.relatedType, t),
    relatedType: row.relatedType,
    relatedId: row.relatedId,
    allowNegative: row.allowNegative,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Apply movement on an existing client/tx (no nested transaction).
 */
export async function applyStockMovementOn(
  tx: DbOrTx,
  context: TenantContext,
  productId: string,
  raw: unknown,
) {
  const input = createStockMovementSchema.parse(raw);

  if (input.allowNegative && context.role === "member") {
    throw new LocalizedError("stock.error.negativeRole");
  }

  if (input.idempotencyKey) {
    const [existing] = await tx
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenantId, context.tenant.id),
          eq(stockMovements.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (existing) {
      return {
        movement: serialize(existing, await getTranslator()),
        stockQuantity: existing.balanceAfter,
        reused: true as const,
      };
    }
  }

  const [product] = await tx
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.tenantId, context.tenant.id),
      ),
    )
    .for("update")
    .limit(1);

  if (!product) throw new LocalizedError("products.error.notFound");

  const { delta, balanceAfter } = computeStockDelta({
    type: input.type,
    quantity: input.quantity,
    current: product.stockQuantity,
  });

  assertStockAllowed({
    balanceAfter,
    allowNegative: input.allowNegative,
    productId,
    requested: input.quantity,
    available: product.stockQuantity,
  });

  await tx
    .update(products)
    .set({ stockQuantity: balanceAfter, updatedAt: new Date() })
    .where(
      and(
        eq(products.id, productId),
        eq(products.tenantId, context.tenant.id),
      ),
    );

  const [row] = await tx
    .insert(stockMovements)
    .values({
      tenantId: context.tenant.id,
      productId,
      type: input.type,
      quantity: delta,
      balanceAfter,
      note: input.note || null,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      allowNegative: input.allowNegative,
      createdBy: context.user.id,
      idempotencyKey: input.idempotencyKey ?? null,
    })
    .returning();

  if (!row) throw new LocalizedError("stock.error.saveFailed");

  logFunnel("funnel.stock_movement", {
    tenantId: context.tenant.id,
    productId,
    type: input.type,
    delta,
    balanceAfter,
  });

  return {
    movement: serialize(row, await getTranslator()),
    stockQuantity: balanceAfter,
    reused: false as const,
  };
}

/**
 * Atomically apply a stock movement and update products.stock_quantity.
 * Sync low-stock evaluation after commit (Loop 24).
 */
export async function applyStockMovement(
  context: TenantContext,
  productId: string,
  raw: unknown,
  client: DbOrTx = db,
) {
  const result = await client.transaction(async (tx) =>
    applyStockMovementOn(tx, context, productId, raw),
  );
  const lowStock = await evaluateLowStockForProducts(context, [productId]);
  return {
    ...result,
    lowStockAlerts: lowStock.items,
  };
}

export async function listStockMovements(
  context: TenantContext,
  productId: string,
  limit = 50,
) {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.tenantId, context.tenant.id),
      ),
    )
    .limit(1);
  if (!product) throw new LocalizedError("products.error.notFound");

  const rows = await db
    .select()
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.productId, productId),
        eq(stockMovements.tenantId, context.tenant.id),
      ),
    )
    .orderBy(desc(stockMovements.createdAt))
    .limit(Math.min(100, Math.max(1, limit)));

  const t = await getTranslator();
  return rows.map((row) => serialize(row, t));
}

export async function reserveStockForRelated(
  context: TenantContext,
  productId: string,
  quantity: number,
  related: { relatedType: string; relatedId: string; note?: string },
  client: DbOrTx = db,
) {
  const payload: MovementInput = {
    type: "reserve",
    quantity,
    // Empty means "no user note"; the reader labels it from relatedType.
    note: related.note ?? "",
    allowNegative: false,
    relatedType: related.relatedType,
    relatedId: related.relatedId,
    idempotencyKey: `reserve:${related.relatedType}:${related.relatedId}:${productId}`,
  };
  if (client === db) {
    return applyStockMovement(context, productId, payload);
  }
  return applyStockMovementOn(client, context, productId, payload);
}

export async function releaseStockReservation(
  context: TenantContext,
  productId: string,
  quantity: number,
  related: { relatedType: string; relatedId: string; note?: string },
  client: DbOrTx = db,
) {
  const payload: MovementInput = {
    type: "in",
    quantity,
    note: related.note ?? "",
    allowNegative: false,
    relatedType: related.relatedType,
    relatedId: related.relatedId,
    idempotencyKey: `release:${related.relatedType}:${related.relatedId}:${productId}`,
  };
  if (client === db) {
    return applyStockMovement(context, productId, payload);
  }
  return applyStockMovementOn(client, context, productId, payload);
}
