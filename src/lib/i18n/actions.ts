"use server";

import { isLocale } from "@hoflayn/i18n";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import { getCurrentUser } from "@/lib/auth/session";
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS } from "./cookie";

export type SetLocaleResult = { ok: boolean };

/**
 * Switches the UI language. The cookie is the transport that every later
 * request reads; `users.locale` is the durable record that survives a new
 * device or cleared cookies.
 */
export async function setLocalePreference(
  locale: string,
): Promise<SetLocaleResult> {
  if (!isLocale(locale)) return { ok: false };

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);

  const user = await getCurrentUser();
  if (user) {
    await db.update(users).set({ locale }).where(eq(users.id, user.id));
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Switches the language of generated content (AI copy, catalog and label
 * exports). Stored per workshop, not per user, because everyone in a workshop
 * sells into the same market.
 */
export async function setContentLocalePreference(
  locale: string,
): Promise<SetLocaleResult> {
  if (!isLocale(locale)) return { ok: false };

  const { tenant, role } = await requireOnboardedTenant();
  if (role === "member") return { ok: false };

  await db
    .update(tenants)
    .set({ contentLocale: locale, updatedAt: new Date() })
    .where(eq(tenants.id, tenant.id));

  revalidatePath("/settings");
  return { ok: true };
}
