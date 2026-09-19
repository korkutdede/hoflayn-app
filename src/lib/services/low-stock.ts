import "server-only";
import { LocalizedError } from "@/lib/i18n/error";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products, tenants } from "@/db/schema";
import type { TenantContext } from "@/lib/auth/session";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  pickLowStockItems,
} from "@/lib/stock/low-stock";
import { logFunnel } from "@/lib/observability/log";

export { DEFAULT_LOW_STOCK_THRESHOLD, pickLowStockItems };

export const updateLowStockSettingsSchema = z.object({
  defaultLowStockThreshold: z.coerce.number().int().min(0).max(100_000),
});

function serializeAlert(
  row: ReturnType<typeof pickLowStockItems>[number],
) {
  return {
    productId: row.productId,
    name: row.name,
    stockQuantity: row.stockQuantity,
    threshold: row.threshold,
    productOverride: row.productOverride,
  };
}

async function tenantDefaultThreshold(tenantId: string) {
  const [tenant] = await db
    .select({
      defaultLowStockThreshold: tenants.defaultLowStockThreshold,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return tenant?.defaultLowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
}

export async function listLowStockAlerts(context: TenantContext) {
  const defaultThreshold = await tenantDefaultThreshold(context.tenant.id);
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      stockQuantity: products.stockQuantity,
      lowStockThreshold: products.lowStockThreshold,
    })
    .from(products)
    .where(eq(products.tenantId, context.tenant.id));

  const items = pickLowStockItems(
    rows.map((r) => ({
      productId: r.id,
      name: r.name,
      stockQuantity: r.stockQuantity,
      productOverride: r.lowStockThreshold,
    })),
    defaultThreshold,
  );

  return {
    defaultThreshold,
    count: items.length,
    items: items.map(serializeAlert),
  };
}

/** Sync check after sale / stock out — tenant-scoped product ids only. */
export async function evaluateLowStockForProducts(
  context: TenantContext,
  productIds: string[],
) {
  const unique = [...new Set(productIds.filter(Boolean))];
  if (!unique.length) {
    return {
      defaultThreshold: await tenantDefaultThreshold(context.tenant.id),
      items: [] as ReturnType<typeof serializeAlert>[],
    };
  }

  const defaultThreshold = await tenantDefaultThreshold(context.tenant.id);
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      stockQuantity: products.stockQuantity,
      lowStockThreshold: products.lowStockThreshold,
    })
    .from(products)
    .where(
      and(
        eq(products.tenantId, context.tenant.id),
        inArray(products.id, unique),
      ),
    );

  const items = pickLowStockItems(
    rows.map((r) => ({
      productId: r.id,
      name: r.name,
      stockQuantity: r.stockQuantity,
      productOverride: r.lowStockThreshold,
    })),
    defaultThreshold,
  ).map(serializeAlert);

  if (items.length) {
    logFunnel("funnel.low_stock_detected", {
      tenantId: context.tenant.id,
      count: items.length,
      productIds: items.map((i) => i.productId),
    });
  }

  return { defaultThreshold, items };
}

export async function updateLowStockSettings(
  context: TenantContext,
  raw: unknown,
) {
  if (context.role === "member") {
    throw new LocalizedError("stock.error.thresholdRole");
  }
  const input = updateLowStockSettingsSchema.parse(raw);
  const [tenant] = await db
    .update(tenants)
    .set({
      defaultLowStockThreshold: input.defaultLowStockThreshold,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, context.tenant.id))
    .returning({
      defaultLowStockThreshold: tenants.defaultLowStockThreshold,
    });
  if (!tenant) throw new LocalizedError("workshop.error.notFound");
  return { defaultThreshold: tenant.defaultLowStockThreshold };
}
