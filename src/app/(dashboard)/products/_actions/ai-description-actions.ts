"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import { isModuleEnabled } from "@/lib/entitlements/check";
import { enqueueAiJob } from "@/lib/ai/jobs/runner";
import {
  parseProductDescription,
  type ProductDescriptionOutput,
} from "@/lib/ai/prompts/product-description";
import { InsufficientCreditsError } from "@/lib/credits/errors";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { getTranslator } from "@/lib/i18n/server";
import { tenantContentLocale } from "@/lib/i18n/content";

export type AiDescriptionState = {
  ok?: boolean;
  error?: string;
  jobId?: string;
  description?: ProductDescriptionOutput;
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

export async function generateProductDescriptionAction(
  prev: AiDescriptionState,
  formData: FormData,
): Promise<AiDescriptionState> {
  void prev;
  const { tenant, user } = await requireOnboardedTenant();
  const t = await getTranslator();

  const productId = String(formData.get("productId") ?? "");
  const productName = String(formData.get("productName") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const material = String(formData.get("material") ?? "").trim();
  const features = String(formData.get("features") ?? "").trim();
  const audience = String(formData.get("audience") ?? "").trim();

  if (!z.string().uuid().safeParse(productId).success) {
    return { ok: false, error: t("products.error.invalidProduct") };
  }
  if (productName.length < 2) {
    return { ok: false, error: t("ai.error.productName") };
  }

  const writerEnabled = await isModuleEnabled(tenant.id, "writer");
  const usedDevBypass = !writerEnabled && isDevWriterBypass();
  if (!writerEnabled && !usedDevBypass) {
    return { ok: false, error: t("ai.error.writerRequired") };
  }

  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, tenant.id)))
    .limit(1);
  if (!product) {
    return { ok: false, error: t("products.error.notFound") };
  }

  if (tenant.creditBalance < CREDIT_COSTS.generate_description) {
    return {
      ok: false,
      error: t("credits.insufficient", {
        required: CREDIT_COSTS.generate_description,
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
        operation: "generate_description",
        contentLocale: tenantContentLocale(tenant),
        input: {
          productId,
          productName,
          category: category || null,
          material: material || null,
          features: features || null,
          audience: audience || null,
          devBypass: usedDevBypass,
        },
      },
      { forceMock },
    );

    revalidatePath(`/products/${productId}`);
    revalidatePath("/dashboard");

    if (job.status !== "succeeded") {
      return {
        ok: false,
        error: job.error ?? t("ai.error.descriptionFailed"),
        jobId: job.id,
        usedDevBypass,
      };
    }

    const raw = job.output?.description;
    const description = parseProductDescription(
      typeof raw === "string" ? raw : JSON.stringify(raw),
    );

    return {
      ok: true,
      jobId: job.id,
      description,
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

export async function confirmAiDescriptionAction(
  prev: AiDescriptionState,
  formData: FormData,
): Promise<AiDescriptionState> {
  void prev;
  const { tenant } = await requireOnboardedTenant();
  const t = await getTranslator();
  const productId = String(formData.get("productId") ?? "");

  const parsed = z
    .object({
      title: z.string().min(1),
      shortDescription: z.string().min(1),
      longDescription: z.string().min(1),
      bullets: z.string().min(1),
      seoKeywords: z.string().min(1),
    })
    .safeParse({
      title: formData.get("title"),
      shortDescription: formData.get("shortDescription"),
      longDescription: formData.get("longDescription"),
      bullets: formData.get("bullets"),
      seoKeywords: formData.get("seoKeywords"),
    });

  if (!z.string().uuid().safeParse(productId).success) {
    return { ok: false, error: t("products.error.invalidProduct") };
  }
  if (!parsed.success) {
    return { ok: false, error: t("ai.error.confirmMissing") };
  }

  const bullets = parsed.data.bullets
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const seoKeywords = parsed.data.seoKeywords
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const descriptionBody = [
    parsed.data.longDescription,
    "",
    ...bullets.map((b) => `• ${b}`),
  ].join("\n");

  const [row] = await db
    .update(products)
    .set({
      name: parsed.data.title,
      description: descriptionBody,
      descriptionAiGenerated: true,
      tags: seoKeywords.join(", "),
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.tenantId, tenant.id)))
    .returning({ id: products.id });

  if (!row) return { ok: false, error: t("ai.error.updateFailed") };

  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");

  return {
    ok: true,
    description: {
      title: parsed.data.title,
      shortDescription: parsed.data.shortDescription,
      longDescription: parsed.data.longDescription,
      bullets,
      seoKeywords,
    },
  };
}
