import "server-only";
import { LocalizedError } from "@/lib/i18n/error";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products } from "@/db/schema";
import { enqueueAiJob } from "@/lib/ai/jobs/runner";
import { shouldForceMockProvider } from "@/lib/ai/registry";
import {
  productDescriptionSchema,
} from "@/lib/ai/prompts/product-description";
import {
  captionToneSchema,
  instagramCaptionSchema,
} from "@/lib/ai/prompts/instagram-caption";
import type { TenantContext } from "@/lib/auth/session";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { isModuleEnabled } from "@/lib/entitlements/check";
import { logFunnel } from "@/lib/observability/log";
import { tenantContentLocale } from "@/lib/i18n/content";

export const descriptionHintsSchema = z.object({
  material: z.string().trim().max(160).optional().default(""),
  features: z.string().trim().max(800).optional().default(""),
  audience: z.string().trim().max(240).optional().default(""),
});

function writerDevBypass() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.DEV_UNLOCK_WRITER === "true"
  );
}

async function requireProduct(context: TenantContext, productId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.tenantId, context.tenant.id),
      ),
    )
    .limit(1);
  if (!product) throw new LocalizedError("products.error.notFound");
  return product;
}

async function writerAccess(context: TenantContext) {
  const enabled = await isModuleEnabled(context.tenant.id, "writer");
  const bypass = !enabled && writerDevBypass();
  if (!enabled && !bypass) {
    throw new LocalizedError("ai.error.planRequired");
  }
  return { bypass };
}

export async function generateProductDescription(
  context: TenantContext,
  productId: string,
  rawHints: unknown,
) {
  const product = await requireProduct(context, productId);
  const { bypass } = await writerAccess(context);
  const hints = descriptionHintsSchema.parse(rawHints);
  if (context.tenant.creditBalance < CREDIT_COSTS.generate_description) {
    throw new LocalizedError("ai.error.descriptionCredits");
  }

  const job = await enqueueAiJob(
    {
      tenantId: context.tenant.id,
      userId: context.user.id,
      module: "writer",
      operation: "generate_description",
      contentLocale: tenantContentLocale(context.tenant),
      input: {
        productId,
        productName: product.name,
        category: product.category,
        material: hints.material || null,
        features: hints.features || null,
        audience: hints.audience || null,
        devBypass: bypass,
      },
    },
    {
      forceMock:
        bypass ||
        shouldForceMockProvider(Boolean(process.env.OPENAI_API_KEY)),
      waitForCompletion: false,
    },
  );
  if (
    job.status !== "succeeded" &&
    job.status !== "pending" &&
    job.status !== "running" &&
    job.status !== "retry_later"
  ) {
    throw new LocalizedError("ai.error.descriptionGenerateFailed");
  }
  return {
    jobId: job.id,
    status: job.status,
    suggestion:
      job.status === "succeeded"
        ? productDescriptionSchema.parse(job.output?.description)
        : undefined,
    creditsCharged: job.creditsCharged,
    provider: job.provider,
    error: job.error ?? undefined,
  };
}

export async function applyProductDescription(
  context: TenantContext,
  productId: string,
  suggestion: unknown,
) {
  const parsed = productDescriptionSchema.parse(suggestion);
  const description = [
    parsed.longDescription,
    "",
    ...parsed.bullets.map((item) => `• ${item}`),
  ].join("\n");
  const [updated] = await db
    .update(products)
    .set({
      name: parsed.title,
      description,
      tags: parsed.seoKeywords.join(", "),
      descriptionAiGenerated: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(products.id, productId),
        eq(products.tenantId, context.tenant.id),
      ),
    )
    .returning({ id: products.id });
  if (!updated) throw new LocalizedError("products.error.notFound");
  return { applied: true as const };
}

export async function generateProductCaption(
  context: TenantContext,
  productId: string,
  rawTone: unknown,
) {
  const product = await requireProduct(context, productId);
  const { bypass } = await writerAccess(context);
  const tone = captionToneSchema.parse(rawTone);
  if (context.tenant.creditBalance < CREDIT_COSTS.generate_caption) {
    throw new LocalizedError("ai.error.captionCredits");
  }

  const job = await enqueueAiJob(
    {
      tenantId: context.tenant.id,
      userId: context.user.id,
      module: "writer",
      operation: "generate_caption",
      contentLocale: tenantContentLocale(context.tenant),
      input: {
        productId,
        productName: product.name,
        category: product.category,
        description: product.description,
        tags: product.tags,
        tone,
        devBypass: bypass,
      },
    },
    {
      forceMock:
        bypass ||
        shouldForceMockProvider(Boolean(process.env.OPENAI_API_KEY)),
      waitForCompletion: false,
    },
  );
  if (
    job.status !== "succeeded" &&
    job.status !== "pending" &&
    job.status !== "running" &&
    job.status !== "retry_later"
  ) {
    throw new LocalizedError("ai.error.captionGenerateFailed");
  }
  const suggestion =
    job.status === "succeeded"
      ? instagramCaptionSchema.parse(job.output?.caption)
      : undefined;
  if (suggestion) {
    logFunnel("funnel.caption_generated", {
      tenantId: context.tenant.id,
      productId,
      jobId: job.id,
      tone,
      provider: job.provider,
    });
  }
  return {
    jobId: job.id,
    status: job.status,
    suggestion,
    creditsCharged: job.creditsCharged,
    provider: job.provider,
    error: job.error ?? undefined,
  };
}
