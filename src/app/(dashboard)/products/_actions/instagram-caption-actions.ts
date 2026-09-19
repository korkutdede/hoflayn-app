"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { products } from "@/db/schema";
import { enqueueAiJob } from "@/lib/ai/jobs/runner";
import {
  captionToneSchema,
  parseInstagramCaption,
  type InstagramCaptionOutput,
} from "@/lib/ai/prompts/instagram-caption";
import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { InsufficientCreditsError } from "@/lib/credits/errors";
import { isModuleEnabled } from "@/lib/entitlements/check";
import { getTranslator } from "@/lib/i18n/server";
import { logFunnel } from "@/lib/observability/log";
import { tenantContentLocale } from "@/lib/i18n/content";

export type InstagramCaptionState = {
  ok?: boolean;
  error?: string;
  jobId?: string;
  caption?: InstagramCaptionOutput;
  creditsCharged?: number;
  provider?: string | null;
  usedDevBypass?: boolean;
};

function isDevWriterBypass(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.DEV_UNLOCK_WRITER === "true"
  );
}

export async function generateInstagramCaptionAction(
  previous: InstagramCaptionState,
  formData: FormData,
): Promise<InstagramCaptionState> {
  void previous;
  const { tenant, user } = await requireOnboardedTenant();
  const t = await getTranslator();

  const parsed = z
    .object({
      productId: z.string().uuid(),
      tone: captionToneSchema,
    })
    .safeParse({
      productId: formData.get("productId"),
      tone: formData.get("tone"),
    });
  if (!parsed.success) {
    return { ok: false, error: t("ai.error.captionInvalid") };
  }

  const writerEnabled = await isModuleEnabled(tenant.id, "writer");
  const usedDevBypass = !writerEnabled && isDevWriterBypass();
  if (!writerEnabled && !usedDevBypass) {
    return { ok: false, error: t("ai.error.captionWriterRequired") };
  }

  // Never trust product details posted by the client; re-read by tenant scope.
  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      description: products.description,
      tags: products.tags,
    })
    .from(products)
    .where(
      and(
        eq(products.id, parsed.data.productId),
        eq(products.tenantId, tenant.id),
      ),
    )
    .limit(1);
  if (!product) {
    return { ok: false, error: t("products.error.notFound") };
  }

  if (tenant.creditBalance < CREDIT_COSTS.generate_caption) {
    return {
      ok: false,
      error: t("credits.insufficient", {
        required: CREDIT_COSTS.generate_caption,
        available: tenant.creditBalance,
      }),
    };
  }

  const forceMock = usedDevBypass || !process.env.OPENAI_API_KEY;

  try {
    const job = await enqueueAiJob(
      {
        tenantId: tenant.id,
        userId: user.id,
        module: "writer",
        operation: "generate_caption",
        contentLocale: tenantContentLocale(tenant),
        input: {
          productId: product.id,
          productName: product.name,
          category: product.category,
          description: product.description,
          tags: product.tags,
          tone: parsed.data.tone,
          devBypass: usedDevBypass,
        },
      },
      { forceMock },
    );

    revalidatePath(`/products/${product.id}`);
    revalidatePath("/dashboard");

    if (job.status !== "succeeded") {
      return {
        ok: false,
        error: job.error ?? t("ai.error.captionFailed"),
        jobId: job.id,
        usedDevBypass,
      };
    }

    const raw = job.output?.caption;
    const caption = parseInstagramCaption(
      typeof raw === "string" ? raw : JSON.stringify(raw),
    );

    logFunnel("funnel.caption_generated", {
      tenantId: tenant.id,
      productId: product.id,
      jobId: job.id,
      tone: parsed.data.tone,
      provider: job.provider,
    });

    return {
      ok: true,
      jobId: job.id,
      caption,
      creditsCharged: job.creditsCharged,
      provider: job.provider,
      usedDevBypass,
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
