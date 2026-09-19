import "server-only";
import { LocalizedError } from "@/lib/i18n/error";
import type { MessageKey, MessageVars } from "@hoflayn/i18n";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { requireMoneyToMinor, addMinor } from "@hoflayn/calc";
import { db } from "@/db";
import { products, saleLines, sales } from "@/db/schema";
import type { TenantContext } from "@/lib/auth/session";
import { parseSalesCsv } from "@/lib/sales/csv";
import { createSaleSchema, voidSaleSchema } from "@/lib/sales/schemas";
import { buildSalesSummary, windowStarts } from "@/lib/sales/summary";
import {
  decideSaleVoid,
  saleVoidStockIdempotencyKey,
} from "@/lib/sales/void";
import { evaluateLowStockForProducts } from "@/lib/services/low-stock";
import {
  applyStockMovementOn,
  InsufficientStockError,
  reserveStockForRelated,
} from "@/lib/services/stock-movements";
import { logFunnel } from "@/lib/observability/log";

export {
  createSaleSchema,
  voidSaleSchema,
  parseSalesCsv,
  InsufficientStockError,
};
export { buildSalesSummary, decideSaleVoid };

export class SaleVoidConflictError extends LocalizedError {
  readonly code = "SALE_VOID_CONFLICT" as const;
  constructor(messageKey: MessageKey, vars?: MessageVars) {
    super(messageKey, vars);
    this.name = "SaleVoidConflictError";
  }
}

/**
 * Takes the whole message key instead of an action label, so the sentence is
 * never assembled from a fragment that only exists in one language.
 */
function requireManager(
  context: TenantContext,
  errorKey: MessageKey = "sales.error.roleRecord",
) {
  if (context.role === "member") throw new LocalizedError(errorKey);
}

function serializeLine(row: typeof saleLines.$inferSelect) {
  return {
    id: row.id,
    saleId: row.saleId,
    productId: row.productId,
    quantity: row.quantity,
    unitPriceMinor: row.unitPriceMinor,
    lineTotalMinor: row.lineTotalMinor,
    productNameSnapshot: row.productNameSnapshot,
    stockMovementId: row.stockMovementId,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeSale(
  row: typeof sales.$inferSelect,
  lines: ReturnType<typeof serializeLine>[],
) {
  return {
    id: row.id,
    source: row.source,
    status: row.status,
    currency: row.currency,
    totalMinor: row.totalMinor,
    note: row.note ?? "",
    soldAt: row.soldAt.toISOString(),
    idempotencyKey: row.idempotencyKey,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lines,
  };
}

async function loadSaleWithLines(
  tenantId: string,
  saleId: string,
) {
  const [row] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.tenantId, tenantId)))
    .limit(1);
  if (!row) return null;
  const lineRows = await db
    .select()
    .from(saleLines)
    .where(
      and(eq(saleLines.saleId, saleId), eq(saleLines.tenantId, tenantId)),
    );
  return serializeSale(row, lineRows.map(serializeLine));
}

/**
 * Atomic sale: header + lines + stock_movements.out in one transaction.
 * related_type=sale, related_id=sale.id for ledger linkage.
 */
export async function createSale(context: TenantContext, raw: unknown) {
  requireManager(context, "sales.error.roleRecord");
  const input = createSaleSchema.parse(raw);

  if (input.source === "hoflayn_web") {
    throw new LocalizedError("sales.error.unsupportedSource");
  }

  if (input.allowNegativeStock && context.role === "member") {
    throw new LocalizedError("stock.error.negativeRole");
  }

  const result = await db.transaction(async (tx) => {
    if (input.idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.tenantId, context.tenant.id),
            eq(sales.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      if (existing) {
        const lineRows = await tx
          .select()
          .from(saleLines)
          .where(
            and(
              eq(saleLines.saleId, existing.id),
              eq(saleLines.tenantId, context.tenant.id),
            ),
          );
        return {
          sale: serializeSale(existing, lineRows.map(serializeLine)),
          reused: true as const,
        };
      }
    }

    const productIds = [...new Set(input.lines.map((l) => l.productId))];
    const productRows = await tx
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, context.tenant.id),
          inArray(products.id, productIds),
        ),
      );
    const byId = new Map(productRows.map((p) => [p.id, p]));
    for (const id of productIds) {
      if (!byId.has(id)) throw new LocalizedError("products.error.notFoundWithId", { id });
    }

    const prepared = input.lines.map((line) => {
      const product = byId.get(line.productId)!;
      const unitPriceMinor = requireMoneyToMinor(line.unitPrice);
      const lineTotalMinor = unitPriceMinor * line.quantity;
      return {
        product,
        quantity: line.quantity,
        unitPriceMinor,
        lineTotalMinor,
      };
    });
    const totalMinor = addMinor(...prepared.map((p) => p.lineTotalMinor));

    const soldAt = input.soldAt ? new Date(input.soldAt) : new Date();
    const [saleRow] = await tx
      .insert(sales)
      .values({
        tenantId: context.tenant.id,
        source: input.source,
        status: "completed",
        currency: input.currency.toUpperCase(),
        totalMinor,
        note: input.note || null,
        soldAt,
        idempotencyKey: input.idempotencyKey ?? null,
        createdBy: context.user.id,
      })
      .returning();
    if (!saleRow) throw new LocalizedError("sales.error.saveFailed");

    const insertedLines: ReturnType<typeof serializeLine>[] = [];

    for (const item of prepared) {
      const movement = await applyStockMovementOn(
        tx,
        context,
        item.product.id,
        {
          type: "out",
          quantity: item.quantity,
          note: "",
          allowNegative: input.allowNegativeStock,
          relatedType: "sale",
          relatedId: saleRow.id,
          idempotencyKey: `sale-out:${saleRow.id}:${item.product.id}:${item.quantity}:${item.unitPriceMinor}`,
        },
      );

      const [lineRow] = await tx
        .insert(saleLines)
        .values({
          saleId: saleRow.id,
          tenantId: context.tenant.id,
          productId: item.product.id,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          lineTotalMinor: item.lineTotalMinor,
          productNameSnapshot: item.product.name,
          stockMovementId: movement.movement.id,
        })
        .returning();
      if (!lineRow) throw new LocalizedError("sales.error.lineSaveFailed");
      insertedLines.push(serializeLine(lineRow));
    }

    logFunnel("funnel.sale_created", {
      tenantId: context.tenant.id,
      saleId: saleRow.id,
      source: saleRow.source,
      lineCount: insertedLines.length,
      totalMinor,
    });

    return {
      sale: serializeSale(saleRow, insertedLines),
      reused: false as const,
    };
  });

  const lowStock = await evaluateLowStockForProducts(
    context,
    result.sale.lines.map((l) => l.productId),
  );
  return {
    ...result,
    lowStockAlerts: lowStock.items,
  };
}

export async function listSales(context: TenantContext, limit = 50) {
  const rows = await db
    .select()
    .from(sales)
    .where(eq(sales.tenantId, context.tenant.id))
    .orderBy(desc(sales.soldAt))
    .limit(Math.min(100, Math.max(1, limit)));

  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const allLines = await db
    .select()
    .from(saleLines)
    .where(
      and(
        eq(saleLines.tenantId, context.tenant.id),
        inArray(saleLines.saleId, ids),
      ),
    );

  const bySale = new Map<string, ReturnType<typeof serializeLine>[]>();
  for (const line of allLines) {
    const list = bySale.get(line.saleId) ?? [];
    list.push(serializeLine(line));
    bySale.set(line.saleId, list);
  }

  return rows.map((row) => serializeSale(row, bySale.get(row.id) ?? []));
}

export async function getSale(context: TenantContext, saleId: string) {
  const sale = await loadSaleWithLines(context.tenant.id, saleId);
  if (!sale) throw new LocalizedError("sales.error.notFound");
  return sale;
}

/**
 * completed → voided with stock restore (in) per line in one transaction.
 * Second void is idempotent no-op (reused: true).
 */
export async function voidSale(
  context: TenantContext,
  saleId: string,
  raw: unknown = {},
) {
  requireManager(context, "sales.error.roleVoid");
  const input = voidSaleSchema.parse(raw ?? {});

  const result = await db.transaction(async (tx) => {
    const [saleRow] = await tx
      .select()
      .from(sales)
      .where(
        and(eq(sales.id, saleId), eq(sales.tenantId, context.tenant.id)),
      )
      .for("update")
      .limit(1);
    if (!saleRow) throw new LocalizedError("sales.error.notFound");

    const decision = decideSaleVoid(saleRow.status);
    if (decision.action === "conflict") {
      throw new SaleVoidConflictError(decision.messageKey, decision.vars);
    }

    const lineRows = await tx
      .select()
      .from(saleLines)
      .where(
        and(
          eq(saleLines.saleId, saleId),
          eq(saleLines.tenantId, context.tenant.id),
        ),
      );

    if (decision.action === "noop_reused") {
      return {
        sale: serializeSale(saleRow, lineRows.map(serializeLine)),
        reused: true as const,
      };
    }

    for (const line of lineRows) {
      await applyStockMovementOn(tx, context, line.productId, {
        type: "in",
        quantity: line.quantity,
        note: input.note || "",
        allowNegative: false,
        relatedType: "sale_void",
        relatedId: saleId,
        idempotencyKey: saleVoidStockIdempotencyKey(
          saleId,
          line.id,
          input.idempotencyKey,
        ),
      });
    }

    const noteParts = [saleRow.note?.trim() || "", input.note?.trim() || ""]
      .filter(Boolean)
      .join(" · ");
    const voidNote = noteParts
      ? `${noteParts} · iptal`
      : "iptal";

    const [updated] = await tx
      .update(sales)
      .set({
        status: "voided",
        note: voidNote,
        updatedAt: new Date(),
      })
      .where(
        and(eq(sales.id, saleId), eq(sales.tenantId, context.tenant.id)),
      )
      .returning();
    if (!updated) throw new LocalizedError("sales.error.voidFailed");

    logFunnel("funnel.sale_voided", {
      tenantId: context.tenant.id,
      saleId,
      lineCount: lineRows.length,
    });

    return {
      sale: serializeSale(updated, lineRows.map(serializeLine)),
      reused: false as const,
    };
  });

  const lowStock = await evaluateLowStockForProducts(
    context,
    result.sale.lines.map((l) => l.productId),
  );
  return {
    ...result,
    lowStockAlerts: lowStock.items,
  };
}

/**
 * Tenant sales analytics from sales + sale_lines (stock-linked completed sales).
 */
export async function getSalesSummary(
  context: TenantContext,
  opts: { productId?: string | null; topN?: number; now?: Date } = {},
) {
  if (opts.productId) {
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, opts.productId),
          eq(products.tenantId, context.tenant.id),
        ),
      )
      .limit(1);
    if (!product) throw new LocalizedError("products.error.notFound");
  }

  const now = opts.now ?? new Date();
  const { last30Start } = windowStarts(now);

  const saleRows = await db
    .select()
    .from(sales)
    .where(
      and(
        eq(sales.tenantId, context.tenant.id),
        gte(sales.soldAt, last30Start),
      ),
    );

  const saleIds = saleRows.map((r) => r.id);
  const lineRows =
    saleIds.length === 0
      ? []
      : await db
          .select()
          .from(saleLines)
          .where(
            and(
              eq(saleLines.tenantId, context.tenant.id),
              inArray(saleLines.saleId, saleIds),
            ),
          );

  return buildSalesSummary({
    now,
    sales: saleRows.map((r) => ({
      id: r.id,
      soldAt: r.soldAt,
      totalMinor: r.totalMinor,
      status: r.status,
    })),
    lines: lineRows.map((l) => ({
      saleId: l.saleId,
      productId: l.productId,
      quantity: l.quantity,
      lineTotalMinor: l.lineTotalMinor,
      productNameSnapshot: l.productNameSnapshot,
    })),
    productId: opts.productId,
    topN: opts.topN,
  });
}

/**
 * CSV import adapter: parse → resolve SKU → one completed sale with stock out.
 * Hoflayn Web remains a separate future adapter.
 */
export async function importSalesFromCsv(
  context: TenantContext,
  raw: { csv: string; note?: string; idempotencyKey?: string | null },
) {
  requireManager(context, "sales.error.roleImport");
  const parsed = parseSalesCsv(raw.csv);
  const [firstError] = parsed.errors;
  if (firstError && !parsed.rows.length) {
    throw new LocalizedError(firstError.messageKey, firstError.vars);
  }
  if (!parsed.rows.length) {
    throw new LocalizedError("sales.error.importEmpty");
  }

  const skus = [...new Set(parsed.rows.map((r) => r.sku))];
  const productRows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.tenantId, context.tenant.id),
        inArray(products.sku, skus),
      ),
    );
  const bySku = new Map(
    productRows.filter((p) => p.sku).map((p) => [p.sku!, p]),
  );

  const unresolved = skus.filter((sku) => !bySku.has(sku));
  if (unresolved.length) {
    throw new LocalizedError("sales.error.skuNotFound", { skus: unresolved.slice(0, 5).join(", ") });
  }

  const lines = parsed.rows.map((row) => ({
    productId: bySku.get(row.sku)!.id,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
  }));

  const noteParts = [
    raw.note?.trim() || "",
    parsed.errors.length ? `CSV uyarıları: ${parsed.errors.length}` : "",
  ].filter(Boolean);

  return createSale(context, {
    source: "csv",
    note: noteParts.join(" · "),
    idempotencyKey: raw.idempotencyKey ?? null,
    lines,
  });
}

/**
 * Hold stock for a future sale (reserve). Call createSale with out for completion,
 * or release via releaseStockReservation when cancelling.
 */
export async function reserveStockForSaleDraft(
  context: TenantContext,
  productId: string,
  quantity: number,
  draftKey: string,
) {
  requireManager(context, "sales.error.roleReserve");
  // No note: the reader gets a localized label from relatedType instead.
  return reserveStockForRelated(context, productId, quantity, {
    relatedType: "sale_draft",
    relatedId: draftKey,
  });
}
