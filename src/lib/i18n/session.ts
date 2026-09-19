import "server-only";
import { isLocale } from "@hoflayn/i18n";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS } from "./cookie";

/**
 * Applies a user's stored language at sign-in. Without this the proxy's
 * negotiated cookie — written on the very first request from any device — would
 * permanently shadow `users.locale`, so the saved preference would never follow
 * the user anywhere.
 *
 * Only callable from Server Actions and Route Handlers, the two places allowed
 * to write cookies.
 */
export async function applyStoredLocale(userId: string): Promise<void> {
  const [row] = await db
    .select({ locale: users.locale })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!isLocale(row?.locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, row.locale, LOCALE_COOKIE_OPTIONS);
}
