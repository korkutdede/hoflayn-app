import "server-only";
import { randomUUID } from "crypto";
import { and, eq, or } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { aiJobs } from "@/db/schema";
import { getCreditCost } from "@/lib/credits/costs";
import {
  releaseCredits,
  reserveCredits,
  settleCredits,
} from "@/lib/credits/manager";
import { logAiUsage } from "@/lib/ai/cost-tracker";
import { runImageOperation, runTextOperation } from "@/lib/ai/registry";
import type { ImageOperation } from "@/lib/ai/types";
import { MockImageProvider } from "@/lib/ai/providers/mock";
import { MockTextProvider } from "@/lib/ai/providers/mock-text";
import {
  getEstimatedCostUsd,
  logCostVariance,
} from "@/lib/ai/cost-model";
import {
  assertTenantCostBudget,
} from "@/lib/ai/cost-limits";
import {
  compositeOnWhite,
  fetchImageBuffer,
} from "@/lib/media/white-bg";
import { uploadTenantImage } from "@/lib/media/storage";
import { assertStorageConfigured } from "@/lib/media/paths";
import { jobContentLocale } from "@/lib/ai/prompts/output-language";
import { createTranslator, type Locale } from "@hoflayn/i18n";
import {
  buildDescriptionPrompt,
  descriptionSystemPrompt,
  parseProductDescription,
} from "@/lib/ai/prompts/product-description";
import {
  buildInstagramCaptionPrompt,
  captionToneSchema,
  instagramCaptionSystemPrompt,
  parseInstagramCaption,
} from "@/lib/ai/prompts/instagram-caption";
import {
  buildProductImageAnalysisPrompt,
  parseProductImageAnalysis,
  productImageAnalysisSystemPrompt,
} from "@/lib/ai/prompts/product-image-analysis";
import {
  buildSeoPrompt,
  finalizeSeoSuggestion,
  parseSeoSuggestion,
  seoSystemPrompt,
  seoChannelIdSchema,
} from "@/lib/ai/prompts/product-seo";
import { runCatalogJob } from "@/lib/catalog/job";
import { runLabelJob } from "@/lib/labels/job";
import { logEvent } from "@/lib/observability/log";
import {
  retryDelayMs,
  shouldDeferAiJobs,
  shouldRetryJob,
} from "@/lib/ai/jobs/policy";

export type CreateAiJobInput = {
  tenantId: string;
  userId: string;
  module: string;
  operation: string;
  /**
   * Language for the generated content, from `tenants.content_locale`. Stored
   * on the job because the worker runs outside the request that created it, so
   * there is no locale to negotiate by the time the prompt is built.
   */
  contentLocale: Locale;
  input?: Record<string, unknown>;
};

export type AiJobRow = typeof aiJobs.$inferSelect;

export async function createAiJob(
  input: CreateAiJobInput,
): Promise<AiJobRow> {
  const [job] = await db
    .insert(aiJobs)
    .values({
      tenantId: input.tenantId,
      userId: input.userId,
      module: input.module,
      operation: input.operation,
      status: "pending",
      input: { ...(input.input ?? {}), contentLocale: input.contentLocale },
    })
    .returning();

  if (!job) {
    throw new Error("createAiJob: insert failed");
  }
  return job;
}

export type ProcessAiJobOptions = {
  forceMock?: boolean;
};

export type EnqueueAiJobOptions = ProcessAiJobOptions & {
  defer?: boolean;
  /** When false, return the queued job immediately and process in the background. */
  waitForCompletion?: boolean;
};

async function finalizeImageUrl(opts: {
  tenantId: string;
  operation: string;
  cutoutUrl: string;
  width?: number;
  height?: number;
}): Promise<{
  imageUrl: string;
  width?: number;
  height?: number;
  processedAssetId?: string;
}> {
  const cutout = await fetchImageBuffer(opts.cutoutUrl);
  const processed =
    opts.operation === "white_bg"
      ? await compositeOnWhite(cutout)
      : await (async () => {
          const metadata = await sharp(cutout).metadata();
          return {
            bytes: cutout,
            width: metadata.width ?? opts.width,
            height: metadata.height ?? opts.height,
            mimeType: "image/png",
          };
        })();

  try {
    assertStorageConfigured();
    const uploaded = await uploadTenantImage({
      tenantId: opts.tenantId,
      bytes: processed.bytes,
      mimeType: processed.mimeType,
      kind: "processed",
      metadata: { operation: opts.operation },
    });
    return {
      imageUrl: uploaded.signedUrl,
      width: processed.width,
      height: processed.height,
      processedAssetId: uploaded.assetId,
    };
  } catch {
    return {
      imageUrl: opts.cutoutUrl,
      width: processed.width,
      height: processed.height,
    };
  }
}

async function runImageJob(
  job: AiJobRow,
  opts: ProcessAiJobOptions,
  lockToken: string,
): Promise<{
  providerId: string;
  model: string;
  costUsd: number;
  output: Record<string, unknown>;
}> {
  const imageUrl =
    typeof job.input?.imageUrl === "string"
      ? job.input.imageUrl
      : "https://example.com/placeholder.png";

  const providerOp: ImageOperation =
    job.operation === "white_bg"
      ? "remove_bg"
      : (job.operation as ImageOperation);
  const provider = opts.forceMock ? new MockImageProvider() : undefined;

  const result = await runImageOperation(
    {
      imageUrl,
      operation: providerOp,
      options: {
        ...(job.input ?? {}),
        jobId: job.id,
        predictionId:
          typeof job.output?.predictionId === "string"
            ? job.output.predictionId
            : undefined,
        onPredictionCreated: async (predictionId: string) => {
          await db
            .update(aiJobs)
            .set({
              output: {
                ...(job.output ?? {}),
                predictionId,
              },
            })
            .where(and(eq(aiJobs.id, job.id), eq(aiJobs.lockToken, lockToken)));
        },
      },
    },
    provider,
  );

  const finalized = await finalizeImageUrl({
    tenantId: job.tenantId,
    operation: job.operation,
    cutoutUrl: result.imageUrl,
    width: result.width,
    height: result.height,
  });

  return {
    providerId: result.providerId,
    model: result.model,
    costUsd: result.costUsd,
    output: {
      imageUrl: finalized.imageUrl,
      cutoutUrl: result.imageUrl,
      width: finalized.width,
      height: finalized.height,
      model: result.model,
      processedAssetId: finalized.processedAssetId,
      sourceMediaAssetId: job.input?.mediaAssetId ?? null,
      predictionId:
        typeof result.raw?.predictionId === "string"
          ? result.raw.predictionId
          : undefined,
    },
  };
}

async function runTextJob(
  job: AiJobRow,
  opts: ProcessAiJobOptions,
): Promise<{
  providerId: string;
  model: string;
  costUsd: number;
  output: Record<string, unknown>;
}> {
  const provider = opts.forceMock ? new MockTextProvider() : undefined;
  const contentLocale = jobContentLocale(job.input);

  if (job.operation === "analyze_product_image") {
    const imageUrl =
      typeof job.input?.imageUrl === "string" ? job.input.imageUrl : "";
    if (!imageUrl) throw new Error("Product image URL is required");

    const craftCategory =
      typeof job.input?.craftCategory === "string"
        ? job.input.craftCategory
        : null;
    const result = await runTextOperation(
      {
        system: productImageAnalysisSystemPrompt(contentLocale),
        prompt: buildProductImageAnalysisPrompt(craftCategory),
        imageUrl,
        options: {
          operation: "analyze_product_image",
          craftCategory,
          jobId: job.id,
        },
      },
      provider,
    );
    return {
      providerId: result.providerId,
      model: result.model,
      costUsd: result.costUsd,
      output: {
        analysis: parseProductImageAnalysis(result.text),
        imageUrl,
        mediaAssetId: job.input?.mediaAssetId ?? null,
        pendingConfirmation: true,
      },
    };
  }

  const productName =
    typeof job.input?.productName === "string"
      ? job.input.productName
      : createTranslator(contentLocale)("ai.fallbackProductName");
  const category =
    typeof job.input?.category === "string" ? job.input.category : null;
  const material =
    typeof job.input?.material === "string" ? job.input.material : null;
  const features =
    typeof job.input?.features === "string" ? job.input.features : null;
  const audience =
    typeof job.input?.audience === "string" ? job.input.audience : null;

  if (job.operation === "generate_caption") {
    const description =
      typeof job.input?.description === "string" ? job.input.description : null;
    const tags = typeof job.input?.tags === "string" ? job.input.tags : null;
    const toneResult = captionToneSchema.safeParse(job.input?.tone);
    const tone = toneResult.success ? toneResult.data : "samimi";

    const result = await runTextOperation(
      {
        system: instagramCaptionSystemPrompt(contentLocale),
        prompt: buildInstagramCaptionPrompt({
          productName,
          category,
          description,
          tags,
          tone,
        }),
        options: {
          operation: "generate_caption",
          productName,
          category,
          tone,
          jobId: job.id,
        },
      },
      provider,
    );
    const caption = parseInstagramCaption(result.text);

    return {
      providerId: result.providerId,
      model: result.model,
      costUsd: result.costUsd,
      output: {
        caption,
        productId:
          typeof job.input?.productId === "string" ? job.input.productId : null,
        // Caption is returned for explicit copy/approval; never persisted.
        pendingConfirmation: true,
      },
    };
  }

  if (job.operation === "analyze_seo") {
    const description =
      typeof job.input?.description === "string" ? job.input.description : null;
    const tags = typeof job.input?.tags === "string" ? job.input.tags : null;
    const channelResult = seoChannelIdSchema.safeParse(job.input?.channel);
    const channel = channelResult.success
      ? channelResult.data
      : "generic_web";

    const result = await runTextOperation(
      {
        system: seoSystemPrompt(contentLocale),
        prompt: buildSeoPrompt({
          channel,
          productName,
          category,
          description,
          tags,
        }),
        options: {
          operation: "analyze_seo",
          productName,
          category,
          channel,
          jobId: job.id,
        },
      },
      provider,
    );
    const parsed = parseSeoSuggestion(result.text, channel);
    const finalized = finalizeSeoSuggestion(parsed, contentLocale);

    return {
      providerId: result.providerId,
      model: result.model,
      costUsd: result.costUsd,
      output: {
        suggestion: finalized.suggestion,
        audit: finalized.audit,
        productId:
          typeof job.input?.productId === "string" ? job.input.productId : null,
        pendingConfirmation: true,
      },
    };
  }

  const result = await runTextOperation(
    {
      system: descriptionSystemPrompt(contentLocale),
      prompt: buildDescriptionPrompt({
        productName,
        category,
        material,
        features,
        audience,
      }),
      options: {
        productName,
        category,
        material,
        features,
        audience,
        jobId: job.id,
      },
    },
    provider,
  );

  const description = parseProductDescription(result.text);

  return {
    providerId: result.providerId,
    model: result.model,
    costUsd: result.costUsd,
    output: {
      description,
      productId:
        typeof job.input?.productId === "string" ? job.input.productId : null,
      // Not auto-saved onto the product — caller must confirm.
      pendingConfirmation: true,
    },
  };
}

/**
 * Lease-guarded processor (ADR-015). It can run inline in development or from
 * the durable production worker and branches by operation family.
 */
export async function processAiJob(
  jobId: string,
  opts: ProcessAiJobOptions = {},
): Promise<AiJobRow> {
  const [candidate] = await db
    .select()
    .from(aiJobs)
    .where(eq(aiJobs.id, jobId))
    .limit(1);

  if (!candidate) {
    throw new Error(`processAiJob: job not found: ${jobId}`);
  }
  if (candidate.status !== "pending" && candidate.status !== "retry_later") {
    return candidate;
  }

  const lockToken = randomUUID();
  const [job] = await db
    .update(aiJobs)
    .set({
      status: "running",
      startedAt: new Date(),
      attempts: candidate.attempts + 1,
      lockedAt: new Date(),
      lockToken,
      nextAttemptAt: null,
    })
    .where(
      and(
        eq(aiJobs.id, candidate.id),
        or(
          eq(aiJobs.status, "pending"),
          eq(aiJobs.status, "retry_later"),
        ),
      ),
    )
    .returning();
  if (!job) {
    const [alreadyClaimed] = await db
      .select()
      .from(aiJobs)
      .where(eq(aiJobs.id, jobId))
      .limit(1);
    if (!alreadyClaimed) {
      throw new Error(`processAiJob: job disappeared: ${jobId}`);
    }
    return alreadyClaimed;
  }

  const creditCost = getCreditCost(job.operation);
  const related = {
    relatedType: "ai_job",
    relatedId: job.id,
    description: `AI ${job.module}/${job.operation}`,
  };

  try {
    await assertTenantCostBudget({
      tenantId: job.tenantId,
      operation: job.operation,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const [failed] = await db
      .update(aiJobs)
      .set({
        status: "failed",
        error: message,
        finishedAt: new Date(),
        lockedAt: null,
        lockToken: null,
      })
      .where(eq(aiJobs.id, job.id))
      .returning();
    if (!failed) throw err;
    return failed;
  }

  let hasReservation = job.creditsReserved > 0;
  if (!hasReservation) {
    try {
      await db.transaction(async (tx) => {
        await reserveCredits(
          job.tenantId,
          creditCost,
          {
            ...related,
            idempotencyKey: `ai-job:${job.id}:reserve`,
          },
          tx,
        );
        const [reservedJob] = await tx
          .update(aiJobs)
          .set({ creditsReserved: creditCost })
          .where(and(eq(aiJobs.id, job.id), eq(aiJobs.lockToken, lockToken)))
          .returning({ id: aiJobs.id });
        if (!reservedJob) {
          throw new Error("processAiJob: lease lost during credit reservation");
        }
      });
      hasReservation = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const [failed] = await db
        .update(aiJobs)
        .set({
          status: "failed",
          error: message,
          finishedAt: new Date(),
          lockedAt: null,
          lockToken: null,
        })
        .where(and(eq(aiJobs.id, job.id), eq(aiJobs.lockToken, lockToken)))
        .returning();
      if (!failed) throw err;
      return failed;
    }
  }

  const started = Date.now();

  try {
    const executed =
      job.operation === "generate_catalog"
        ? await runCatalogJob(job)
        : job.operation === "generate_labels"
          ? await runLabelJob(job)
          : job.operation === "generate_description" ||
              job.operation === "generate_caption" ||
              job.operation === "analyze_product_image" ||
              job.operation === "analyze_seo"
            ? await runTextJob(job, opts)
            : await runImageJob(job, opts, lockToken);

    const latencyMs = Date.now() - started;
    const estimatedUsd = getEstimatedCostUsd(job.operation);

    await logAiUsage({
      tenantId: job.tenantId,
      aiJobId: job.id,
      provider: executed.providerId,
      model: executed.model,
      costUsd: executed.costUsd,
      latencyMs,
    });

    logCostVariance({
      operation: job.operation,
      estimatedUsd,
      actualUsd: executed.costUsd,
      tenantId: job.tenantId,
      jobId: job.id,
      provider: executed.providerId,
    });

    await settleCredits(job.tenantId, creditCost, related);

    const [updated] = await db
      .update(aiJobs)
      .set({
        status: "succeeded",
        provider: executed.providerId,
        creditsCharged: creditCost,
        creditsReserved: 0,
        output: executed.output,
        finishedAt: new Date(),
        error: null,
        lockedAt: null,
        lockToken: null,
      })
      .where(and(eq(aiJobs.id, job.id), eq(aiJobs.lockToken, lockToken)))
      .returning();

    if (!updated) {
      throw new Error("processAiJob: failed to mark succeeded");
    }

    logEvent("ai_job.succeeded", {
      jobId: job.id,
      tenantId: job.tenantId,
      module: job.module,
      operation: job.operation,
      provider: executed.providerId,
      model: executed.model,
      creditsCharged: creditCost,
      costUsd: executed.costUsd,
      latencyMs,
    });

    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retry = shouldRetryJob(err, job.attempts, job.maxAttempts);

    logEvent(
      "ai_job.failed",
      {
        jobId: job.id,
        tenantId: job.tenantId,
        module: job.module,
        operation: job.operation,
        error: message,
        willRetry: retry,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
      },
      retry ? "warn" : "error",
    );

    if (retry) {
      const [scheduled] = await db
        .update(aiJobs)
        .set({
          status: "retry_later",
          error: message,
          nextAttemptAt: new Date(Date.now() + retryDelayMs(job.attempts)),
          lockedAt: null,
          lockToken: null,
        })
        .where(and(eq(aiJobs.id, job.id), eq(aiJobs.lockToken, lockToken)))
        .returning();
      if (!scheduled) {
        throw err instanceof Error ? err : new Error(message);
      }
      return scheduled;
    }

    const finalStatus =
      job.attempts >= job.maxAttempts ? "dead_letter" : "failed";
    const failed = await db.transaction(async (tx) => {
      if (hasReservation) {
        await releaseCredits(
          job.tenantId,
          creditCost,
          {
            ...related,
            description: `Refund AI ${job.module}/${job.operation}`,
            idempotencyKey: `ai-job:${job.id}:refund`,
          },
          tx,
        );
      }
      const [row] = await tx
        .update(aiJobs)
        .set({
          status: finalStatus,
          error: message,
          creditsReserved: 0,
          creditsCharged: 0,
          finishedAt: new Date(),
          lockedAt: null,
          lockToken: null,
        })
        .where(and(eq(aiJobs.id, job.id), eq(aiJobs.lockToken, lockToken)))
        .returning();
      return row;
    });

    if (!failed) {
      throw err instanceof Error ? err : new Error(message);
    }
    return failed;
  }
}

export async function enqueueAiJob(
  input: CreateAiJobInput,
  opts: EnqueueAiJobOptions = {},
): Promise<AiJobRow> {
  const job = await createAiJob(input);
  const {
    defer = shouldDeferAiJobs(),
    waitForCompletion = true,
    ...processOptions
  } = opts;
  if (defer) return job;
  if (!waitForCompletion) {
    void processAiJob(job.id, processOptions).catch((error) => {
      logEvent(
        "ai_job.failed",
        {
          jobId: job.id,
          tenantId: job.tenantId,
          module: job.module,
          operation: job.operation,
          error: error instanceof Error ? error.message : String(error),
          background: true,
        },
        "error",
      );
    });
    return job;
  }
  return processAiJob(job.id, processOptions);
}
