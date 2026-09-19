import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { labelExportItems, labelExports } from "@/db/schema";
import { LABEL_EXPORT_TTL_DAYS } from "@/lib/labels/constants";
import { jobContentLocale } from "@/lib/ai/prompts/output-language";
import { renderLabelPdf } from "@/lib/labels/pdf";
import { jobCurrency } from "@/lib/tenant/currency";
import { uploadTenantExport } from "@/lib/media/storage";

type LabelJobRow = {
  id: string;
  tenantId: string;
  input: Record<string, unknown> | null;
};

export async function runLabelJob(job: LabelJobRow): Promise<{
  providerId: string;
  model: string;
  costUsd: number;
  output: Record<string, unknown>;
}> {
  const exportId =
    typeof job.input?.exportId === "string" ? job.input.exportId : "";
  if (!exportId) throw new Error("exportId is required");

  const [exportRow] = await db
    .select()
    .from(labelExports)
    .where(
      and(
        eq(labelExports.id, exportId),
        eq(labelExports.tenantId, job.tenantId),
      ),
    )
    .limit(1);
  if (!exportRow) throw new Error("Label export not found for tenant");

  await db
    .update(labelExports)
    .set({ status: "running", jobId: job.id })
    .where(
      and(
        eq(labelExports.id, exportId),
        eq(labelExports.tenantId, job.tenantId),
      ),
    );

  try {
    const items = await db
      .select()
      .from(labelExportItems)
      .where(
        and(
          eq(labelExportItems.exportId, exportId),
          eq(labelExportItems.tenantId, job.tenantId),
        ),
      )
      .orderBy(asc(labelExportItems.sortOrder));

    if (!items.length) throw new Error("Label export has no items");

    const pdfBytes = await renderLabelPdf({
      locale: jobContentLocale(job.input),
      currency: jobCurrency(job.input),
      size: exportRow.size,
      format: exportRow.format,
      copies: exportRow.copies,
      showPrice: exportRow.showPrice,
      showName: exportRow.showName,
      items: items.map((item) => ({
        name: item.nameSnapshot,
        price: item.priceSnapshot,
        sku: item.skuSnapshot,
        barcodeValue: item.barcodeValueSnapshot,
      })),
    });

    const ttlAt = new Date(
      Date.now() + LABEL_EXPORT_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    const uploaded = await uploadTenantExport({
      tenantId: job.tenantId,
      bytes: pdfBytes,
      mimeType: "application/pdf",
      ttlAt,
      metadata: {
        source: "label-export",
        exportId,
        jobId: job.id,
        size: exportRow.size,
        format: exportRow.format,
      },
    });

    await db
      .update(labelExports)
      .set({
        status: "succeeded",
        mediaAssetId: uploaded.assetId,
        jobId: job.id,
        error: null,
        finishedAt: new Date(),
      })
      .where(
        and(
          eq(labelExports.id, exportId),
          eq(labelExports.tenantId, job.tenantId),
        ),
      );

    return {
      providerId: "local",
      model: "bwip-js+pdfkit",
      costUsd: 0.0008,
      output: {
        exportId,
        mediaAssetId: uploaded.assetId,
        pdfUrl: uploaded.signedUrl,
        bytes: uploaded.sizeBytes,
        itemCount: items.length,
        copies: exportRow.copies,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(labelExports)
      .set({
        status: "failed",
        error: message,
        finishedAt: new Date(),
        jobId: job.id,
      })
      .where(
        and(
          eq(labelExports.id, exportId),
          eq(labelExports.tenantId, job.tenantId),
        ),
      );
    throw error;
  }
}
