import "server-only";
import { LocalizedError } from "@/lib/i18n/error";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { mediaAssets, products } from "@/db/schema";
import { enqueueAiJob } from "@/lib/ai/jobs/runner";
import { shouldForceMockProvider } from "@/lib/ai/registry";
import { formattedProductImageAnalysisSchema } from "@/lib/ai/prompts/product-image-analysis";
import type { TenantContext } from "@/lib/auth/session";
import {
  markMediaOrphanIfUnused,
  markPreviousCoverOrphan,
} from "@/lib/media/orphan";
import { craftCategoryLabels } from "@/lib/craft/categories";
import { createSignedUrl, uploadTenantImage } from "@/lib/media/storage";
import { logFunnel } from "@/lib/observability/log";
import { tenantContentLocale } from "@/lib/i18n/content";
import { createTranslator } from "@hoflayn/i18n";

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(8000).optional().default(""),
  price: z.string().trim().optional().default(""),
  costPrice: z.string().trim().optional().default(""),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  /** null / omit → tenant default threshold */
  lowStockThreshold: z
    .union([z.coerce.number().int().min(0).max(100_000), z.null()])
    .optional()
    .default(null),
  category: z.string().trim().max(80).optional().default(""),
  tags: z.string().trim().max(400).optional().default(""),
  coverImageId: z.string().uuid().nullable().optional().default(null),
  lengthCm: z.string().trim().optional().default(""),
  widthCm: z.string().trim().optional().default(""),
  heightCm: z.string().trim().optional().default(""),
  weightKg: z.string().trim().optional().default(""),
  sku: z.string().trim().max(64).optional().default(""),
  barcodeValue: z.string().trim().max(64).optional().default(""),
  barcodeFormat: z
    .enum(["code128", "qr", "gs1_128"])
    .optional()
    .default("code128"),
});

function optionalMeasure(value: string, scale: number): string | null {
  if (!value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new LocalizedError("products.error.invalidMeasure");
  }
  return number.toFixed(scale);
}

const MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024;
const PRODUCT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function analyzeProductImage(
  context: TenantContext,
  image: File,
) {
  if (!(image instanceof File) || image.size === 0) {
    throw new LocalizedError("products.error.analyzeImageRequired");
  }
  if (!PRODUCT_IMAGE_TYPES.has(image.type)) {
    throw new LocalizedError("studio.error.badType");
  }
  if (image.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new LocalizedError("studio.error.tooLarge", { mb: 8 });
  }
  const uploaded = await uploadTenantImage({
    tenantId: context.tenant.id,
    bytes: Buffer.from(await image.arrayBuffer()),
    mimeType: image.type,
    kind: "upload",
    metadata: { originalName: image.name, source: "product-analysis" },
  });

  const job = await enqueueAiJob(
    {
      tenantId: context.tenant.id,
      userId: context.user.id,
      module: "products",
      operation: "analyze_product_image",
      contentLocale: tenantContentLocale(context.tenant),
      input: {
        imageUrl: uploaded.signedUrl,
        mediaAssetId: uploaded.assetId,
        originalName: image.name,
        craftCategory: craftCategoryLabels(
          context.tenant.craftCategory,
          createTranslator(tenantContentLocale(context.tenant)),
        ),
      },
    },
    {
      forceMock: shouldForceMockProvider(Boolean(process.env.OPENAI_API_KEY)),
      waitForCompletion: false,
    },
  );
  return {
    jobId: job.id,
    status: job.status,
    analysis:
      job.status === "succeeded"
        ? formattedProductImageAnalysisSchema.parse(job.output?.analysis)
        : undefined,
    coverImageId: uploaded.assetId,
    imageUrl: uploaded.signedUrl,
    creditsCharged: job.creditsCharged,
    error: job.error ?? undefined,
  };
}

type ProductRow = typeof products.$inferSelect;

function optionalNumeric(value: string): string | null {
  if (!value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new LocalizedError("products.error.invalidPrice");
  }
  return number.toFixed(2);
}

async function assertCoverBelongsToTenant(
  tenantId: string,
  coverImageId: string | null,
) {
  if (!coverImageId) return;
  const [asset] = await db
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(
      and(eq(mediaAssets.id, coverImageId), eq(mediaAssets.tenantId, tenantId)),
    )
    .limit(1);
  if (!asset) throw new LocalizedError("products.error.coverNotOwned");
}

async function serializeProduct(row: ProductRow) {
  let coverUrl: string | undefined;
  if (row.coverImageId) {
    const [asset] = await db
      .select({ path: mediaAssets.path })
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.id, row.coverImageId),
          eq(mediaAssets.tenantId, row.tenantId),
        ),
      )
      .limit(1);
    if (asset) {
      try {
        coverUrl = await createSignedUrl(asset.path, 3600);
      } catch {
        coverUrl = undefined;
      }
    }
  }

  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description ?? "",
    descriptionAiGenerated: row.descriptionAiGenerated,
    price: row.price ?? "",
    costPrice: row.costPrice ?? "",
    stockQuantity: row.stockQuantity,
    lowStockThreshold: row.lowStockThreshold,
    category: row.category ?? "",
    tags: row.tags ?? "",
    coverImageId: row.coverImageId,
    coverUrl,
    lengthCm: row.lengthCm ?? "",
    widthCm: row.widthCm ?? "",
    heightCm: row.heightCm ?? "",
    weightKg: row.weightKg ?? "",
    seoTitle: row.seoTitle ?? "",
    seoMetaDescription: row.seoMetaDescription ?? "",
    seoSlug: row.seoSlug ?? "",
    seoPrimaryKeyword: row.seoPrimaryKeyword ?? "",
    seoSecondaryKeywords: row.seoSecondaryKeywords ?? "",
    seoChannel: row.seoChannel ?? "",
    seoAppliedAt: row.seoAppliedAt?.toISOString() ?? null,
    sku: row.sku ?? "",
    barcodeValue: row.barcodeValue ?? "",
    barcodeFormat: (row.barcodeFormat as "code128" | "qr" | "gs1_128") ?? "code128",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listProducts(tenantId: string) {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.tenantId, tenantId))
    .orderBy(desc(products.createdAt))
    .limit(100);
  return Promise.all(rows.map(serializeProduct));
}

export async function getProduct(tenantId: string, productId: string) {
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
    .limit(1);
  return row ? serializeProduct(row) : null;
}

export async function createProduct(tenantId: string, rawInput: unknown) {
  const input = productInputSchema.parse(rawInput);
  await assertCoverBelongsToTenant(tenantId, input.coverImageId);

  const [row] = await db
    .insert(products)
    .values({
      tenantId,
      name: input.name,
      description: input.description || null,
      price: optionalNumeric(input.price),
      costPrice: optionalNumeric(input.costPrice),
      stockQuantity: input.stockQuantity,
      lowStockThreshold: input.lowStockThreshold,
      category: input.category || null,
      tags: input.tags || null,
      coverImageId: input.coverImageId,
      lengthCm: optionalMeasure(input.lengthCm, 2),
      widthCm: optionalMeasure(input.widthCm, 2),
      heightCm: optionalMeasure(input.heightCm, 2),
      weightKg: optionalMeasure(input.weightKg, 3),
      sku: input.sku || null,
      barcodeValue: input.barcodeValue || null,
      barcodeFormat: input.barcodeFormat,
    })
    .returning();
  if (!row) throw new LocalizedError("products.error.createFailed");

  logFunnel("funnel.product_created", {
    tenantId,
    productId: row.id,
    hasCover: Boolean(row.coverImageId),
  });
  return serializeProduct(row);
}

export async function updateProduct(
  tenantId: string,
  productId: string,
  rawInput: unknown,
) {
  const input = productInputSchema.parse(rawInput);
  await assertCoverBelongsToTenant(tenantId, input.coverImageId);

  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
    .limit(1);
  if (!existing) return null;

  const [row] = await db
    .update(products)
    .set({
      name: input.name,
      description: input.description || null,
      price: optionalNumeric(input.price),
      costPrice: optionalNumeric(input.costPrice),
      stockQuantity: input.stockQuantity,
      lowStockThreshold: input.lowStockThreshold,
      category: input.category || null,
      tags: input.tags || null,
      coverImageId: input.coverImageId,
      lengthCm: optionalMeasure(input.lengthCm, 2),
      widthCm: optionalMeasure(input.widthCm, 2),
      heightCm: optionalMeasure(input.heightCm, 2),
      weightKg: optionalMeasure(input.weightKg, 3),
      sku: input.sku || null,
      barcodeValue: input.barcodeValue || null,
      barcodeFormat: input.barcodeFormat,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
    .returning();
  if (!row) return null;

  await markPreviousCoverOrphan({
    tenantId,
    previousCoverId: existing.coverImageId,
    nextCoverId: row.coverImageId,
  });
  return serializeProduct(row);
}

export async function setProductCover(
  tenantId: string,
  productId: string,
  coverImageId: string,
) {
  await assertCoverBelongsToTenant(tenantId, coverImageId);
  const [existing] = await db
    .select({ coverImageId: products.coverImageId })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
    .limit(1);
  if (!existing) return null;
  const [row] = await db
    .update(products)
    .set({ coverImageId, updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
    .returning();
  if (!row) return null;
  await markPreviousCoverOrphan({
    tenantId,
    previousCoverId: existing.coverImageId,
    nextCoverId: coverImageId,
  });
  return serializeProduct(row);
}

export async function deleteProduct(tenantId: string, productId: string) {
  const [existing] = await db
    .select({ id: products.id, coverImageId: products.coverImageId })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
    .limit(1);
  if (!existing) return false;

  await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));
  await markMediaOrphanIfUnused(tenantId, existing.coverImageId);
  return true;
}

export async function listCoverOptions(tenantId: string) {
  const rows = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.tenantId, tenantId))
    .orderBy(desc(mediaAssets.createdAt))
    .limit(24);

  const options = await Promise.all(
    rows.map(async (row) => {
      try {
        return {
          id: row.id,
          url: await createSignedUrl(row.path, 3600),
          kind: row.kind,
          createdAt: row.createdAt.toISOString(),
        };
      } catch {
        return null;
      }
    }),
  );
  return options.filter((option) => option !== null);
}
