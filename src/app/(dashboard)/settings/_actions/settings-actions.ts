"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import { CRAFT_CATEGORY_IDS } from "@/lib/craft/categories";
import { getTranslator } from "@/lib/i18n/server";
import { SUPPORTED_CURRENCIES } from "@/lib/tenant/currency";
import type { Translator } from "@hoflayn/i18n";

export type SettingsActionState = {
  error?: string;
  success?: string;
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
    currency: z.enum(SUPPORTED_CURRENCIES),
  });
}

export async function updateWorkshopSettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const { tenant } = await requireOnboardedTenant();
  const t = await getTranslator();

  const parsed = schema(t).safeParse({
    name: formData.get("name"),
    craftCategory: formData.get("craftCategory"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? t("auth.error.invalidForm"),
    };
  }

  await db
    .update(tenants)
    .set({
      name: parsed.data.name,
      craftCategory: parsed.data.craftCategory,
      currency: parsed.data.currency,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenant.id));

  revalidatePath("/settings");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");

  return { success: t("settings.saved") };
}
