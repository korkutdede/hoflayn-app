import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogExports,
  catalogItems,
  catalogs,
} from "@/db/schema";
import { CATALOG_EXPORT_TTL_DAYS } from "@/lib/catalog/constants";
import { jobContentLocale } from "@/lib/ai/prompts/output-language";
import { renderCatalogPdf } from "@/lib/catalog/pdf";
import { jobCurrency } from "@/lib/tenant/currency";
import { createSignedUrl, uploadTenantExport } from "@/lib/media/storage";
import { fetchImageBuffer } from "@/lib/media/white-bg";

type CatalogJobRow = {
  id: string;
  tenantId: string;
  input: Record<string, unknown> | null;
};

type WorkshopSnapshot = {
  name?: string;
  craftLabel?: string;
};

async function loadImageBuffer(path: string | null | undefined) {
  if (!path) return null;
  try {
    const url = await createSignedUrl(path, 600);
    return await fetchImageBuffer(url);
  } catch {
    return null;
  }
}

/**
 * Durable catalog PDF job (module=catalog, operation=generate_catalog).
 */
export async function runCatalogJob(job: CatalogJobRow): Promise<{
  providerId: string;
  model: string;
  costUsd: number;
  output: Record<string, unknown>;
}> {
  const catalogId =
    typeof job.input?.catalogId === "string" ? job.input.catalogId : "";
  const exportId =
    typeof job.input?.exportId === "string" ? job.input.exportId : "";
  if (!catalogId || !exportId) {
    throw new Error("catalogId and exportId are required");
  }

  const [catalog] = await db
    .select()
    .from(catalogs)
    .where(
      and(eq(catalogs.id, catalogId), eq(catalogs.tenantId, job.tenantId)),
    )
    .limit(1);
  if (!catalog) throw new Error("Catalog not found for tenant");

  const [exportRow] = await db
    .select()
    .from(catalogExports)
    .where(
      and(
        eq(catalogExports.id, exportId),
        eq(catalogExports.catalogId, catalogId),
        eq(catalogExports.tenantId, job.tenantId),
      ),
    )
    .limit(1);
  if (!exportRow) throw new Error("Catalog export not found for tenant");

  await db
    .update(catalogExports)
    .set({ status: "running", jobId: job.id })
    .where(
      and(
        eq(catalogExports.id, exportId),
        eq(catalogExports.tenantId, job.tenantId),
      ),
    );

  try {
    const items = await db
      .select()
      .from(catalogItems)
      .where(
        and(
          eq(catalogItems.catalogId, catalogId),
          eq(catalogItems.tenantId, job.tenantId),
        ),
      )
      .orderBy(asc(catalogItems.sortOrder));

    if (items.length === 0) {
      throw new Error("Catalog has no items");
    }

    const pdfItems = [];
    for (const item of items) {
      pdfItems.push({
        name: item.nameSnapshot,
        description: item.descriptionSnapshot,
        price: item.priceSnapshot,
        image: await loadImageBuffer(item.coverPathSnapshot),
      });
    }

    const workshop = (catalog.workshopSnapshot ?? {}) as WorkshopSnapshot;
    const pdfBytes = await renderCatalogPdf({
      locale: jobContentLocale(job.input),
      currency: jobCurrency(job.input),
      title: catalog.title,
      templateId: catalog.templateId,
      theme: catalog.theme,
      showPrices: catalog.showPrices,
      showWorkshop: catalog.showWorkshop,
      workshopName: workshop.name ?? null,
      craftLabel: workshop.craftLabel ?? null,
      items: pdfItems,
    });

    const ttlAt = new Date(
      Date.now() + CATALOG_EXPORT_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    const uploaded = await uploadTenantExport({
      tenantId: job.tenantId,
      bytes: pdfBytes,
      mimeType: "application/pdf",
      ttlAt,
      metadata: {
        source: "catalog-export",
        catalogId,
        exportId,
        templateId: catalog.templateId,
        jobId: job.id,
      },
    });

    await db
      .update(catalogExports)
      .set({
        status: "succeeded",
        mediaAssetId: uploaded.assetId,
        jobId: job.id,
        error: null,
        finishedAt: new Date(),
      })
      .where(
        and(
          eq(catalogExports.id, exportId),
          eq(catalogExports.tenantId, job.tenantId),
        ),
      );

    return {
      providerId: "local",
      model: "pdfkit",
      costUsd: 0.001,
      output: {
        catalogId,
        exportId,
        mediaAssetId: uploaded.assetId,
        pdfUrl: uploaded.signedUrl,
        bytes: uploaded.sizeBytes,
        templateId: catalog.templateId,
        itemCount: items.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(catalogExports)
      .set({
        status: "failed",
        error: message,
        finishedAt: new Date(),
        jobId: job.id,
      })
      .where(
        and(
          eq(catalogExports.id, exportId),
          eq(catalogExports.tenantId, job.tenantId),
        ),
      );
    throw error;
  }
}
