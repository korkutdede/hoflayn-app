"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { requireOnboardingPage } from "@/lib/auth/onboarding";
import { CRAFT_CATEGORY_IDS } from "@/lib/craft/categories";
import { getTranslator } from "@/lib/i18n/server";
import { logFunnel } from "@/lib/observability/log";
import type { Translator } from "@hoflayn/i18n";

export type OnboardingActionState = {
  error?: string;
};

const NAME_MIN_LENGTH = 2;

function schema(t: Translator) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(
        NAME_MIN_LENGTH,
        t("onboarding.error.nameMin", { min: NAME_MIN_LENGTH }),
      )
      .max(80),
    craftCategory: z.enum(CRAFT_CATEGORY_IDS),
  });
}

export async function completeOnboardingAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const { tenant } = await requireOnboardingPage();
  const t = await getTranslator();

  const parsed = schema(t).safeParse({
    name: formData.get("name"),
    craftCategory: formData.get("craftCategory"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? t("auth.error.invalidForm"),
    };
  }

  if (!process.env.DATABASE_URL) {
    return { error: t("onboarding.error.noDatabase") };
  }

  await db
    .update(tenants)
    .set({
      name: parsed.data.name,
      craftCategory: parsed.data.craftCategory,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenant.id));

  logFunnel("funnel.onboarding_done", {
    tenantId: tenant.id,
    craftCategory: parsed.data.craftCategory,
  });

  redirect("/studio");
}
