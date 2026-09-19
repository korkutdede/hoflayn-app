"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/session";
import { enqueueAiJob } from "@/lib/ai/jobs/runner";
import { InsufficientCreditsError } from "@/lib/credits/errors";
import { getTranslator } from "@/lib/i18n/server";
import { tenantContentLocale } from "@/lib/i18n/content";

export type TestJobActionState = {
  ok?: boolean;
  error?: string;
  jobId?: string;
  status?: string;
  creditsCharged?: number;
  provider?: string | null;
};

/**
 * Dashboard smoke test: runs remove_bg via the mock provider so it works
 * without REPLICATE_API_TOKEN / before real studio upload exists.
 */
export async function createTestRemoveBgJob(
  prev: TestJobActionState,
  formData: FormData,
): Promise<TestJobActionState> {
  void prev;
  void formData;
  const { user, tenant } = await requireTenant();

  const t = await getTranslator();

  if (!process.env.DATABASE_URL) {
    return { ok: false, error: t("dashboard.testJob.error.noDatabase") };
  }

  try {
    const job = await enqueueAiJob(
      {
        tenantId: tenant.id,
        userId: user.id,
        module: "studio",
        operation: "remove_bg",
        contentLocale: tenantContentLocale(tenant),
        input: {
          imageUrl: "https://example.com/test-product.png",
          test: true,
        },
      },
      { forceMock: true },
    );

    revalidatePath("/dashboard");

    return {
      ok: job.status === "succeeded",
      jobId: job.id,
      status: job.status,
      creditsCharged: job.creditsCharged,
      provider: job.provider,
      error: job.status === "failed" ? (job.error ?? "Job failed") : undefined,
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
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
