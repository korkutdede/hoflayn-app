import "server-only";
import { LocalizedError } from "@/lib/i18n/error";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { productSeoHistory, products } from "@/db/schema";
import { enqueueAiJob } from "@/lib/ai/jobs/runner";
import { shouldForceMockProvider } from "@/lib/ai/registry";
import {
  finalizeSeoSuggestion,
  seoSuggestionSchema,
} from "@/lib/ai/prompts/product-seo";
import {
  analyzeSeoInputSchema,
  applySeoInputSchema,
} from "@/lib/ai/seo/schemas";
import type { TenantContext } from "@/lib/auth/session";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { isModuleEnabled } from "@/lib/entitlements/check";
import { logFunnel } from "@/lib/observability/log";
import { tenantContentLocale } from "@/lib/i18n/content";

export { analyzeSeoInputSchema, applySeoInputSchema };

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
    throw new LocalizedError("seo.error.planRequired");
  }
  return { bypass };
}

function requireManager(context: TenantContext) {
  if (context.role === "member") {
    throw new LocalizedError("seo.error.applyRole");
  }
}

function serializeHistory(row: typeof productSeoHistory.$inferSelect) {
  return {
    id: row.id,
    productId: row.productId,
    jobId: row.jobId,
    channel: row.channel,
    suggestion: row.suggestion,
    audit: row.audit,
    appliedFields: row.appliedFields,
    createdAt: row.createdAt.toISOString(),
    appliedAt: row.appliedAt?.toISOString() ?? null,
  };
}

export async function analyzeProductSeo(
  context: TenantContext,
  productId: string,
  rawInput: unknown,
) {
  const product = await requireProduct(context, productId);
  const { bypass } = await writerAccess(context);
  const input = analyzeSeoInputSchema.parse(rawInput ?? {});
  if (context.tenant.creditBalance < CREDIT_COSTS.analyze_seo) {
    throw new LocalizedError("seo.error.insufficientCredits");
  }

  const job = await enqueueAiJob(
    {
      tenantId: context.tenant.id,
      userId: context.user.id,
      module: "writer",
      operation: "analyze_seo",
      contentLocale: tenantContentLocale(context.tenant),
      input: {
        productId,
        productName: product.name,
        category: product.category,
        description: product.description,
        tags: product.tags,
        channel: input.channel,
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
    throw new LocalizedError("seo.error.generateFailed");
  }

  const suggestion =
    job.status === "succeeded"
      ? seoSuggestionSchema.parse(job.output?.suggestion)
      : undefined;
  const audit =
    job.status === "succeeded" && job.output?.audit
      ? (job.output.audit as Record<string, unknown>)
      : undefined;

  if (suggestion) {
    logFunnel("funnel.seo_analyzed", {
      tenantId: context.tenant.id,
      productId,
      jobId: job.id,
      channel: suggestion.channel,
      score: typeof audit?.score === "number" ? audit.score : null,
      provider: job.provider,
    });
  }

  return {
    jobId: job.id,
    status: job.status,
    suggestion,
    audit,
    creditsCharged: job.creditsCharged,
    provider: job.provider,
    error: job.error ?? undefined,
    pendingConfirmation: true as const,
  };
}

export async function applyProductSeo(
  context: TenantContext,
  productId: string,
  rawInput: unknown,
) {
  requireManager(context);
  await requireProduct(context, productId);
  const input = applySeoInputSchema.parse(rawInput);
  const { suggestion, audit } = finalizeSeoSuggestion(input.suggestion);

  const patch: Partial<typeof products.$inferInsert> = {
    updatedAt: new Date(),
    seoChannel: suggestion.channel,
    seoAppliedAt: new Date(),
  };

  if (input.apply.title) patch.seoTitle = suggestion.title;
  if (input.apply.metaDescription) {
    patch.seoMetaDescription = suggestion.metaDescription;
  }
  if (input.apply.slug) patch.seoSlug = suggestion.slug;
  if (input.apply.primaryKeyword) {
    patch.seoPrimaryKeyword = suggestion.primaryKeyword;
  }
  if (input.apply.secondaryKeywords) {
    patch.seoSecondaryKeywords = suggestion.secondaryKeywords.join(", ");
  }
  if (input.apply.tagsFromKeywords) {
    const keywords = [
      suggestion.primaryKeyword,
      ...suggestion.secondaryKeywords,
    ];
    patch.tags = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))].join(
      ", ",
    );
  }

  const [updated] = await db
    .update(products)
    .set(patch)
    .where(
      and(
        eq(products.id, productId),
        eq(products.tenantId, context.tenant.id),
      ),
    )
    .returning();
  if (!updated) throw new LocalizedError("products.error.notFound");

  const [history] = await db
    .insert(productSeoHistory)
    .values({
      tenantId: context.tenant.id,
      productId,
      jobId: input.jobId ?? null,
      channel: suggestion.channel,
      suggestion,
      audit,
      appliedFields: input.apply,
      appliedAt: new Date(),
    })
    .returning();

  logFunnel("funnel.seo_applied", {
    tenantId: context.tenant.id,
    productId,
    channel: suggestion.channel,
    fields: input.apply,
  });

  return {
    applied: true as const,
    historyId: history?.id ?? null,
    product: {
      seoTitle: updated.seoTitle ?? "",
      seoMetaDescription: updated.seoMetaDescription ?? "",
      seoSlug: updated.seoSlug ?? "",
      seoPrimaryKeyword: updated.seoPrimaryKeyword ?? "",
      seoSecondaryKeywords: updated.seoSecondaryKeywords ?? "",
      seoChannel: updated.seoChannel ?? "",
      seoAppliedAt: updated.seoAppliedAt?.toISOString() ?? null,
      tags: updated.tags ?? "",
    },
  };
}

export async function getProductSeo(
  context: TenantContext,
  productId: string,
) {
  const product = await requireProduct(context, productId);
  const history = await db
    .select()
    .from(productSeoHistory)
    .where(
      and(
        eq(productSeoHistory.productId, productId),
        eq(productSeoHistory.tenantId, context.tenant.id),
      ),
    )
    .orderBy(desc(productSeoHistory.createdAt))
    .limit(20);

  const applied = history.find((row) => row.appliedAt);
  return {
    current: {
      seoTitle: product.seoTitle ?? "",
      seoMetaDescription: product.seoMetaDescription ?? "",
      seoSlug: product.seoSlug ?? "",
      seoPrimaryKeyword: product.seoPrimaryKeyword ?? "",
      seoSecondaryKeywords: product.seoSecondaryKeywords ?? "",
      seoChannel: product.seoChannel ?? "",
      seoAppliedAt: product.seoAppliedAt?.toISOString() ?? null,
    },
    lastApplied: applied ? serializeHistory(applied) : null,
    history: history.map(serializeHistory),
  };
}
