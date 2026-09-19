import "server-only";
import {
  createPluralTranslator,
  createTranslator,
  getDictionary,
  type PluralTranslator,
  resolveLocale,
  type Dictionary,
  type Locale,
  type Translator,
} from "@hoflayn/i18n";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { COUNTRY_HEADER, LOCALE_COOKIE } from "./cookie";

/**
 * Resolves the locale for the current request in Server Components, Route
 * Handlers and Server Actions.
 *
 * This repeats the proxy's negotiation instead of trusting the cookie alone,
 * because on a visitor's very first request the cookie exists only on the
 * response still being built. Both paths call the same pure resolver, so they
 * cannot disagree.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
    country:
      headerStore.get(COUNTRY_HEADER) ?? process.env.LOCALE_DEBUG_COUNTRY,
  }).locale;
});

/**
 * Same negotiation, plus the stored preference of a signed-in user. Pass
 * `users.locale` where a session is already loaded; it ranks below an explicit
 * cookie so switching language on a shared device still works.
 */
export async function getLocaleForUser(
  stored: string | null | undefined,
): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    user: stored,
    acceptLanguage: headerStore.get("accept-language"),
    country:
      headerStore.get(COUNTRY_HEADER) ?? process.env.LOCALE_DEBUG_COUNTRY,
  }).locale;
}

export const getRequestDictionary = cache(async (): Promise<Dictionary> => {
  return getDictionary(await getLocale());
});

export const getTranslator = cache(async (): Promise<Translator> => {
  return createTranslator(await getLocale());
});

/** For countable messages, where English needs "1 day" but "2 days". */
export const getPluralTranslator = cache(
  async (): Promise<PluralTranslator> => {
    return createPluralTranslator(await getLocale());
  },
);
