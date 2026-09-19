/**
 * Supported UI locales. `tr` is the source language: dictionaries are authored
 * in Turkish and every other locale must cover the same keys.
 */
export const LOCALES = ["tr", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** First visit and any request without an explicit language choice. */
export const DEFAULT_LOCALE: Locale = "tr";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && LOCALES.includes(value as Locale)
  );
}

/** ISO 3166-1 alpha-2 country -> locale, for the IP-geolocation fallback. */
const COUNTRY_LOCALES: Record<string, Locale> = {
  TR: "tr",
};

/**
 * Served to anyone whose own language we cannot offer — an unlisted country or
 * a browser asking for neither Turkish nor English. Turkish is the default for
 * *absent* signals, never for signals that rule Turkish out.
 */
export const INTERNATIONAL_LOCALE: Locale = "en";

export function localeFromCountry(
  country: string | null | undefined,
): Locale | null {
  if (!country) return null;
  const code = country.trim().toUpperCase();
  if (code.length !== 2) return null;
  return COUNTRY_LOCALES[code] ?? INTERNATIONAL_LOCALE;
}

/** BCP 47 tags handed to `Intl` formatters. */
export const LOCALE_TAGS: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-US",
};
