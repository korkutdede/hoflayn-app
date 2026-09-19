"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import { requireModule, ModuleDisabledError } from "@/lib/entitlements/check";
import { uploadTenantImage } from "@/lib/media/storage";
import { StorageNotConfiguredError } from "@/lib/media/paths";
import { getTranslator } from "@/lib/i18n/server";
import { tenantContentLocale } from "@/lib/i18n/content";
import { enqueueAiJob } from "@/lib/ai/jobs/runner";
import { InsufficientCreditsError } from "@/lib/credits/errors";
import { CREDIT_COSTS, getCreditCost } from "@/lib/credits/costs";
import { checkStudioRateLimit } from "@/lib/observability/rate-limit";
import { logFunnel } from "@/lib/observability/log";

const MAX_MB = 8;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const modeSchema = z.enum(["remove_bg", "white_bg"]);

export type StudioJobState = {
  ok?: boolean;
  error?: string;
  jobId?: string;
  status?: string;
  beforeUrl?: string;
  afterUrl?: string;
  creditsCharged?: number;
  provider?: string | null;
  operation?: string;
  creditCost?: number;
};

export async function createStudioJobAction(
  prev: StudioJobState,
  formData: FormData,
): Promise<StudioJobState> {
  void prev;

  const ctx = await requireOnboardedTenant();
  const t = await getTranslator();

  try {
    await requireModule(ctx.tenant.id, "studio");
  } catch (err) {
    if (err instanceof ModuleDisabledError) {
      return { ok: false, error: t("studio.error.moduleOff") };
    }
    throw err;
  }

  if (!process.env.DATABASE_URL) {
    return { ok: false, error: t("studio.error.noDatabase") };
  }

  const rate = checkStudioRateLimit(ctx.tenant.id);
  if (!rate.allowed) {
    return {
      ok: false,
      error: t("studio.error.rateLimit", {
        limit: rate.limit,
        seconds: Math.ceil(rate.retryAfterMs / 1000),
      }),
    };
  }

  const modeParsed = modeSchema.safeParse(formData.get("mode"));
  if (!modeParsed.success) {
    return { ok: false, error: t("studio.error.invalidMode") };
  }
  const operation = modeParsed.data;
  const creditCost = getCreditCost(operation);

  if (ctx.tenant.creditBalance < creditCost) {
    return {
      ok: false,
      error: t("credits.insufficient", {
        required: creditCost,
        available: ctx.tenant.creditBalance,
      }),
      creditCost,
    };
  }

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: t("studio.error.noFile") };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: t("studio.error.badType") };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: t("studio.error.tooLarge", { mb: MAX_MB }) };
  }

  let beforeUrl: string;
  let mediaAssetId: string | undefined;
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const uploaded = await uploadTenantImage({
      tenantId: ctx.tenant.id,
      bytes,
      mimeType: file.type,
      kind: "upload",
      metadata: { originalName: file.name, source: "studio" },
    });
    beforeUrl = uploaded.signedUrl;
    mediaAssetId = uploaded.assetId;
  } catch (err) {
    // Without Storage: use a data URL so the mock pipeline still works locally.
    if (err instanceof StorageNotConfiguredError) {
      beforeUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
    } else {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const forceMock = !process.env.REPLICATE_API_TOKEN;

  try {
    const job = await enqueueAiJob(
      {
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        module: "studio",
        operation,
        contentLocale: tenantContentLocale(ctx.tenant),
        input: {
          imageUrl: beforeUrl,
          mediaAssetId: mediaAssetId ?? null,
          originalName: file.name,
        },
      },
      { forceMock },
    );

    revalidatePath("/studio");
    revalidatePath("/dashboard");

    logFunnel("funnel.studio_job", {
      tenantId: ctx.tenant.id,
      jobId: job.id,
      operation,
      status: job.status,
      provider: job.provider,
    });

    const afterUrl =
      typeof job.output?.imageUrl === "string" ? job.output.imageUrl : undefined;

    return {
      ok: job.status === "succeeded",
      jobId: job.id,
      status: job.status,
      beforeUrl,
      afterUrl,
      creditsCharged: job.creditsCharged,
      provider: job.provider,
      operation,
      creditCost: CREDIT_COSTS[operation],
      error:
        job.status === "failed"
          ? (job.error ?? t("studio.error.jobFailed"))
          : undefined,
    };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return {
        ok: false,
        error: t("credits.insufficient", {
          required: err.required,
          available: err.available,
        }),
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
