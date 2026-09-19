import "server-only";
import { LocalizedError } from "@/lib/i18n/error";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogExports,
  catalogItems,
  catalogs,
  mediaAssets,
  products,
} from "@/db/schema";
import { enqueueAiJob } from "@/lib/ai/jobs/runner";
import type { TenantContext } from "@/lib/auth/session";
import {
  CATALOG_EXPORT_TTL_DAYS,
  MAX_CATALOG_ITEMS,
} from "@/lib/catalog/constants";
import {
  createCatalogSchema,
  exportCatalogSchema,
} from "@/lib/catalog/schemas";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { ModuleDisabledError, requireModule } from "@/lib/entitlements/check";
import { createSignedUrl } from "@/lib/media/storage";
import { logFunnel } from "@/lib/observability/log";
import { craftCategoryLabels } from "@/lib/craft/categories";
import { tenantContentLocale } from "@/lib/i18n/content";
import { tenantCurrency } from "@/lib/tenant/currency";
import { createTranslator } from "@hoflayn/i18n";

export {
  CATALOG_EXPORT_TTL_DAYS,
  MAX_CATALOG_ITEMS,
  createCatalogSchema,
  exportCatalogSchema,
};

function catalogDevBypass() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.DEV_UNLOCK_CATALOG === "true"
  );
}

async function requireCatalogAccess(context: TenantContext) {
  try {
    await requireModule(context.tenant.id, "catalog");
    return { bypass: false };
  } catch (error) {
    if (error instanceof ModuleDisabledError && catalogDevBypass()) {
      return { bypass: true };
    }
    if (error instanceof ModuleDisabledError) {
      throw new LocalizedError("catalogs.error.planRequired");
    }
    throw error;
  }
}

function requireManager(context: TenantContext) {
  if (context.role === "member") {
    throw new LocalizedError("catalogs.error.role");
  }
}

async function serializeExport(row: typeof catalogExports.$inferSelect) {
  let pdfUrl: string | undefined;
  if (row.mediaAssetId) {
    const [asset] = await db
      .select({ path: mediaAssets.path, tenantId: mediaAssets.tenantId })
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.id, row.mediaAssetId),
          eq(mediaAssets.tenantId, row.tenantId),
        ),
      )
      .limit(1);
    if (asset) {
      try {
        pdfUrl = await createSignedUrl(asset.path, 3600);
      } catch {
        pdfUrl = undefined;
      }
    }
  }
  return {
    id: row.id,
    catalogId: row.catalogId,
    jobId: row.jobId,
    mediaAssetId: row.mediaAssetId,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    error: row.error ?? undefined,
    pdfUrl,
    createdAt: row.createdAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
  };
}

async function serializeCatalog(row: typeof catalogs.$inferSelect) {
  const items = await db
    .select()
    .from(catalogItems)
    .where(
      and(
        eq(catalogItems.catalogId, row.id),
        eq(catalogItems.tenantId, row.tenantId),
      ),
    )
    .orderBy(asc(catalogItems.sortOrder));

  const exports = await db
    .select()
    .from(catalogExports)
    .where(
      and(
        eq(catalogExports.catalogId, row.id),
        eq(catalogExports.tenantId, row.tenantId),
      ),
    )
    .orderBy(desc(catalogExports.createdAt))
    .limit(5);

  return {
    id: row.id,
    title: row.title,
    templateId: row.templateId,
    theme: row.theme,
    showPrices: row.showPrices,
    showWorkshop: row.showWorkshop,
    coverProductId: row.coverProductId,
    workshopSnapshot: row.workshopSnapshot,
    itemCount: items.length,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      sortOrder: item.sortOrder,
      name: item.nameSnapshot,
      description: item.descriptionSnapshot ?? "",
      price: item.priceSnapshot ?? "",
    })),
    latestExport: exports[0] ? await serializeExport(exports[0]) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCatalogs(context: TenantContext) {
  await requireCatalogAccess(context);
  const rows = await db
    .select()
    .from(catalogs)
    .where(eq(catalogs.tenantId, context.tenant.id))
    .orderBy(desc(catalogs.updatedAt))
    .limit(50);
  return Promise.all(rows.map(serializeCatalog));
}

export async function getCatalog(context: TenantContext, catalogId: string) {
  await requireCatalogAccess(context);
  const [row] = await db
    .select()
    .from(catalogs)
    .where(
      and(
        eq(catalogs.id, catalogId),
        eq(catalogs.tenantId, context.tenant.id),
      ),
    )
    .limit(1);
  if (!row) throw new LocalizedError("catalogs.error.notFound");
  return serializeCatalog(row);
}

export async function createCatalog(context: TenantContext, raw: unknown) {
  requireManager(context);
  await requireCatalogAccess(context);
  const input = createCatalogSchema.parse(raw);

  const uniqueIds = [...new Set(input.productIds)];
  const productRows = await db
    .select()
    .from(products)
    .where(eq(products.tenantId, context.tenant.id));
  const byId = new Map(productRows.map((p) => [p.id, p]));
  for (const id of uniqueIds) {
    if (!byId.has(id)) throw new LocalizedError("catalogs.error.itemNotFound");
  }

  const coverPaths = new Map<string, string | null>();
  for (const product of productRows) {
    if (!product.coverImageId) {
      coverPaths.set(product.id, null);
      continue;
    }
    const [asset] = await db
      .select({ path: mediaAssets.path })
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.id, product.coverImageId),
          eq(mediaAssets.tenantId, context.tenant.id),
        ),
      )
      .limit(1);
    coverPaths.set(product.id, asset?.path ?? null);
  }

  if (input.coverProductId && !byId.has(input.coverProductId)) {
    throw new LocalizedError("catalogs.error.coverNotFound");
  }

  const workshopSnapshot = {
    name: context.tenant.name,
    craftCategory: context.tenant.craftCategory,
    craftLabel: craftCategoryLabels(
      context.tenant.craftCategory,
      createTranslator(tenantContentLocale(context.tenant)),
    ),
  };

  const [catalog] = await db
    .insert(catalogs)
    .values({
      tenantId: context.tenant.id,
      title: input.title,
      templateId: input.templateId,
      theme: input.theme,
      showPrices: input.showPrices,
      showWorkshop: input.showWorkshop,
      coverProductId: input.coverProductId,
      workshopSnapshot,
    })
    .returning();
  if (!catalog) throw new LocalizedError("catalogs.error.createFailed");

  await db.insert(catalogItems).values(
    uniqueIds.map((productId, index) => {
      const product = byId.get(productId)!;
      return {
        catalogId: catalog.id,
        tenantId: context.tenant.id,
        productId,
        sortOrder: index,
        nameSnapshot: product.name,
        descriptionSnapshot: product.description,
        priceSnapshot: product.price,
        coverPathSnapshot: coverPaths.get(productId) ?? null,
      };
    }),
  );

  logFunnel("funnel.catalog_created", {
    tenantId: context.tenant.id,
    catalogId: catalog.id,
    itemCount: uniqueIds.length,
    templateId: input.templateId,
  });

  return serializeCatalog(catalog);
}

export async function startCatalogExport(
  context: TenantContext,
  catalogId: string,
  raw: unknown,
) {
  requireManager(context);
  await requireCatalogAccess(context);
  const input = exportCatalogSchema.parse(raw);

  if (context.tenant.creditBalance < CREDIT_COSTS.generate_catalog) {
    throw new LocalizedError("catalogs.error.insufficientCredits");
  }

  const [catalog] = await db
    .select()
    .from(catalogs)
    .where(
      and(
        eq(catalogs.id, catalogId),
        eq(catalogs.tenantId, context.tenant.id),
      ),
    )
    .limit(1);
  if (!catalog) throw new LocalizedError("catalogs.error.notFound");

  const [existing] = await db
    .select()
    .from(catalogExports)
    .where(
      and(
        eq(catalogExports.tenantId, context.tenant.id),
        eq(catalogExports.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      export: await serializeExport(existing),
      jobId: existing.jobId,
      reused: true as const,
    };
  }

  const [exportRow] = await db
    .insert(catalogExports)
    .values({
      tenantId: context.tenant.id,
      catalogId,
      status: "pending",
      idempotencyKey: input.idempotencyKey,
    })
    .returning();
  if (!exportRow) throw new LocalizedError("catalogs.error.exportCreateFailed");

  const job = await enqueueAiJob(
    {
      tenantId: context.tenant.id,
      userId: context.user.id,
      module: "catalog",
      operation: "generate_catalog",
      contentLocale: tenantContentLocale(context.tenant),
      input: {
        catalogId,
        exportId: exportRow.id,
        currency: tenantCurrency(context.tenant),
      },
    },
    { waitForCompletion: false },
  );

  await db
    .update(catalogExports)
    .set({ jobId: job.id, status: "running" })
    .where(
      and(
        eq(catalogExports.id, exportRow.id),
        eq(catalogExports.tenantId, context.tenant.id),
      ),
    );

  const [updated] = await db
    .select()
    .from(catalogExports)
    .where(eq(catalogExports.id, exportRow.id))
    .limit(1);

  logFunnel("funnel.catalog_export_started", {
    tenantId: context.tenant.id,
    catalogId,
    exportId: exportRow.id,
    jobId: job.id,
  });

  return {
    export: await serializeExport(updated ?? exportRow),
    jobId: job.id,
    reused: false as const,
  };
}

export async function getCatalogExport(
  context: TenantContext,
  catalogId: string,
  exportId: string,
) {
  await requireCatalogAccess(context);
  const [row] = await db
    .select()
    .from(catalogExports)
    .where(
      and(
        eq(catalogExports.id, exportId),
        eq(catalogExports.catalogId, catalogId),
        eq(catalogExports.tenantId, context.tenant.id),
      ),
    )
    .limit(1);
  if (!row) throw new LocalizedError("catalogs.error.exportNotFound");
  return serializeExport(row);
}
