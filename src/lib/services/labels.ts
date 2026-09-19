import "server-only";
import { LocalizedError } from "@/lib/i18n/error";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  labelExportItems,
  labelExports,
  mediaAssets,
  products,
} from "@/db/schema";
import { enqueueAiJob } from "@/lib/ai/jobs/runner";
import type { TenantContext } from "@/lib/auth/session";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { ModuleDisabledError, requireModule } from "@/lib/entitlements/check";
import {
  LABEL_EXPORT_TTL_DAYS,
  MAX_LABEL_PRODUCTS,
} from "@/lib/labels/constants";
import { resolveBarcodePayload } from "@/lib/labels/encode";
import { createLabelExportSchema } from "@/lib/labels/schemas";
import { createSignedUrl } from "@/lib/media/storage";
import { logFunnel } from "@/lib/observability/log";
import { tenantContentLocale } from "@/lib/i18n/content";
import { tenantCurrency } from "@/lib/tenant/currency";

export { createLabelExportSchema, LABEL_EXPORT_TTL_DAYS, MAX_LABEL_PRODUCTS };

function barcodeDevBypass() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.DEV_UNLOCK_BARCODE === "true"
  );
}

async function requireBarcodeAccess(context: TenantContext) {
  try {
    await requireModule(context.tenant.id, "barcode");
    return { bypass: false };
  } catch (error) {
    if (error instanceof ModuleDisabledError && barcodeDevBypass()) {
      return { bypass: true };
    }
    if (error instanceof ModuleDisabledError) {
      throw new LocalizedError("labels.error.planRequired");
    }
    throw error;
  }
}

function requireManager(context: TenantContext) {
  if (context.role === "member") {
    throw new LocalizedError("labels.error.role");
  }
}

async function serializeExport(row: typeof labelExports.$inferSelect) {
  let pdfUrl: string | undefined;
  if (row.mediaAssetId) {
    const [asset] = await db
      .select({ path: mediaAssets.path })
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

  const items = await db
    .select()
    .from(labelExportItems)
    .where(
      and(
        eq(labelExportItems.exportId, row.id),
        eq(labelExportItems.tenantId, row.tenantId),
      ),
    )
    .orderBy(asc(labelExportItems.sortOrder));

  return {
    id: row.id,
    status: row.status,
    size: row.size,
    format: row.format,
    copies: row.copies,
    showPrice: row.showPrice,
    showName: row.showName,
    idempotencyKey: row.idempotencyKey,
    jobId: row.jobId,
    mediaAssetId: row.mediaAssetId,
    error: row.error ?? undefined,
    pdfUrl,
    itemCount: items.length,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.nameSnapshot,
      price: item.priceSnapshot ?? "",
      sku: item.skuSnapshot ?? "",
      barcodeValue: item.barcodeValueSnapshot,
    })),
    createdAt: row.createdAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
  };
}

export async function listLabelExports(context: TenantContext) {
  await requireBarcodeAccess(context);
  const rows = await db
    .select()
    .from(labelExports)
    .where(eq(labelExports.tenantId, context.tenant.id))
    .orderBy(desc(labelExports.createdAt))
    .limit(30);
  return Promise.all(rows.map(serializeExport));
}

export async function getLabelExport(context: TenantContext, exportId: string) {
  await requireBarcodeAccess(context);
  const [row] = await db
    .select()
    .from(labelExports)
    .where(
      and(
        eq(labelExports.id, exportId),
        eq(labelExports.tenantId, context.tenant.id),
      ),
    )
    .limit(1);
  if (!row) throw new LocalizedError("labels.error.exportNotFound");
  return serializeExport(row);
}

export async function startLabelExport(
  context: TenantContext,
  raw: unknown,
) {
  requireManager(context);
  await requireBarcodeAccess(context);
  const input = createLabelExportSchema.parse(raw);

  if (context.tenant.creditBalance < CREDIT_COSTS.generate_labels) {
    throw new LocalizedError("labels.error.insufficientCredits");
  }

  const [existing] = await db
    .select()
    .from(labelExports)
    .where(
      and(
        eq(labelExports.tenantId, context.tenant.id),
        eq(labelExports.idempotencyKey, input.idempotencyKey),
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

  const uniqueIds = [...new Set(input.productIds)];
  const productRows = await db
    .select()
    .from(products)
    .where(eq(products.tenantId, context.tenant.id));
  const byId = new Map(productRows.map((p) => [p.id, p]));

  const snapshots = uniqueIds.map((productId, index) => {
    const product = byId.get(productId);
    if (!product) throw new LocalizedError("labels.error.itemNotFound");
    const barcodeValue = resolveBarcodePayload({
      format: input.format,
      sku: product.sku,
      barcodeValue: product.barcodeValue,
    });
    return {
      productId,
      sortOrder: index,
      nameSnapshot: product.name,
      priceSnapshot: product.price,
      skuSnapshot: product.sku,
      barcodeValueSnapshot: barcodeValue,
    };
  });

  const [exportRow] = await db
    .insert(labelExports)
    .values({
      tenantId: context.tenant.id,
      status: "pending",
      size: input.size,
      format: input.format,
      copies: input.copies,
      showPrice: input.showPrice,
      showName: input.showName,
      idempotencyKey: input.idempotencyKey,
    })
    .returning();
  if (!exportRow) throw new LocalizedError("labels.error.exportCreateFailed");

  await db.insert(labelExportItems).values(
    snapshots.map((snap) => ({
      exportId: exportRow.id,
      tenantId: context.tenant.id,
      ...snap,
    })),
  );

  const job = await enqueueAiJob(
    {
      tenantId: context.tenant.id,
      userId: context.user.id,
      module: "barcode",
      operation: "generate_labels",
      contentLocale: tenantContentLocale(context.tenant),
      input: {
        exportId: exportRow.id,
        currency: tenantCurrency(context.tenant),
      },
    },
    { waitForCompletion: false },
  );

  await db
    .update(labelExports)
    .set({ jobId: job.id, status: "running" })
    .where(
      and(
        eq(labelExports.id, exportRow.id),
        eq(labelExports.tenantId, context.tenant.id),
      ),
    );

  const [updated] = await db
    .select()
    .from(labelExports)
    .where(eq(labelExports.id, exportRow.id))
    .limit(1);

  logFunnel("funnel.labels_export_started", {
    tenantId: context.tenant.id,
    exportId: exportRow.id,
    jobId: job.id,
    itemCount: snapshots.length,
    size: input.size,
    format: input.format,
  });

  return {
    export: await serializeExport(updated ?? exportRow),
    jobId: job.id,
    reused: false as const,
  };
}
