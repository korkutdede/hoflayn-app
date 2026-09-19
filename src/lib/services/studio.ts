import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { aiJobs } from "@/db/schema";
import { enqueueAiJob } from "@/lib/ai/jobs/runner";
import { shouldForceMockProvider } from "@/lib/ai/registry";
import type { TenantContext } from "@/lib/auth/session";
import { getCreditCost } from "@/lib/credits/costs";
import { InsufficientCreditsError } from "@/lib/credits/errors";
import { ModuleDisabledError, requireModule } from "@/lib/entitlements/check";
import { LocalizedError } from "@/lib/i18n/error";
import { StorageNotConfiguredError } from "@/lib/media/paths";
import { uploadTenantImage } from "@/lib/media/storage";
import { logFunnel } from "@/lib/observability/log";
import { checkStudioRateLimit } from "@/lib/observability/rate-limit";
import { tenantContentLocale } from "@/lib/i18n/content";

const MAX_MB = 8;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const studioModeSchema = z.enum(["remove_bg", "white_bg"]);

export async function createStudioJob(
  context: TenantContext,
  file: File,
  rawMode: unknown,
) {
  try {
    await requireModule(context.tenant.id, "studio");
  } catch (error) {
    if (error instanceof ModuleDisabledError) {
      throw new LocalizedError("studio.error.moduleOff");
    }
    throw error;
  }

  const mode = studioModeSchema.parse(rawMode);
  const creditCost = getCreditCost(mode);
  if (context.tenant.creditBalance < creditCost) {
    throw new InsufficientCreditsError(
      context.tenant.id,
      creditCost,
      context.tenant.creditBalance,
    );
  }

  const rate = checkStudioRateLimit(context.tenant.id);
  if (!rate.allowed) {
    throw new LocalizedError("studio.error.rateLimitSeconds", {
      seconds: Math.ceil(rate.retryAfterMs / 1000),
    });
  }

  if (!(file instanceof File) || file.size === 0) {
    throw new LocalizedError("studio.error.noFile");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new LocalizedError("studio.error.badType");
  }
  if (file.size > MAX_BYTES) {
    throw new LocalizedError("studio.error.tooLarge", { mb: MAX_MB });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  let beforeUrl: string;
  let mediaAssetId: string | undefined;
  try {
    const upload = await uploadTenantImage({
      tenantId: context.tenant.id,
      bytes,
      mimeType: file.type,
      kind: "upload",
      metadata: { originalName: file.name, source: "studio-mobile" },
    });
    beforeUrl = upload.signedUrl;
    mediaAssetId = upload.assetId;
  } catch (error) {
    // Without Storage: use a data URL so the mock pipeline still works locally.
    if (!(error instanceof StorageNotConfiguredError)) {
      throw error;
    }
    beforeUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
  }

  const job = await enqueueAiJob(
    {
      tenantId: context.tenant.id,
      userId: context.user.id,
      module: "studio",
      operation: mode,
      contentLocale: tenantContentLocale(context.tenant),
      input: {
        imageUrl: beforeUrl,
        mediaAssetId: mediaAssetId ?? null,
        originalName: file.name,
      },
    },
    {
      forceMock: shouldForceMockProvider(
        Boolean(process.env.REPLICATE_API_TOKEN),
      ),
      waitForCompletion: false,
    },
  );

  logFunnel("funnel.studio_job", {
    tenantId: context.tenant.id,
    jobId: job.id,
    operation: mode,
    status: job.status,
    provider: job.provider,
  });

  return {
    id: job.id,
    status: job.status,
    operation: mode,
    creditsCharged: job.creditsCharged,
    provider: job.provider,
    beforeUrl,
    afterUrl:
      typeof job.output?.imageUrl === "string"
        ? job.output.imageUrl
        : undefined,
    processedAssetId:
      typeof job.output?.processedAssetId === "string"
        ? job.output.processedAssetId
        : undefined,
    error: job.error ?? undefined,
  };
}

export async function getStudioJob(tenantId: string, jobId: string) {
  const [job] = await db
    .select()
    .from(aiJobs)
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.tenantId, tenantId)))
    .limit(1);
  if (!job) return null;

  return {
    id: job.id,
    status: job.status,
    operation: studioModeSchema.parse(job.operation),
    creditsCharged: job.creditsCharged,
    provider: job.provider,
    beforeUrl:
      typeof job.input?.imageUrl === "string" ? job.input.imageUrl : undefined,
    afterUrl:
      typeof job.output?.imageUrl === "string"
        ? job.output.imageUrl
        : undefined,
    processedAssetId:
      typeof job.output?.processedAssetId === "string"
        ? job.output.processedAssetId
        : undefined,
    error: job.error ?? undefined,
  };
}
