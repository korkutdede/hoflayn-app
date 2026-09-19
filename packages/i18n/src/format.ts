import { LOCALE_TAGS, type Locale } from "./locales";

/**
 * React Native's Hermes ships a reduced ICU on some Android builds, so every
 * formatter degrades to an unlocalized string instead of throwing.
 */
function withFallback(format: () => string, fallback: () => string): string {
  try {
    return format();
  } catch {
    return fallback();
  }
}

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return withFallback(
    () => new Intl.NumberFormat(LOCALE_TAGS[locale], options).format(value),
    () => String(value),
  );
}

/**
 * Formats integer minor units (kuruş/cents), the money model used across
 * `@hoflayn/calc`, the API and the database. Assumes a two-digit minor unit
 * like the rest of that model.
 *
 * Currency is deliberately a separate argument from locale: an English UI can
 * still be showing TRY sales.
 */
export function formatMoneyMinor(
  minor: number,
  currency: string,
  locale: Locale,
): string {
  const major = minor / 100;

  return withFallback(
    () =>
      new Intl.NumberFormat(LOCALE_TAGS[locale], {
        style: "currency",
        currency,
      }).format(major),
    () => `${major.toFixed(2)} ${currency}`,
  );
}

/**
 * Formats the decimal strings Postgres `numeric` columns return (product
 * prices). Non-numeric input is echoed with the code appended rather than
 * rendering "NaN" into a PDF.
 */
export function formatMoneyDecimal(
  value: string | number,
  currency: string,
  locale: Locale,
): string {
  // `Number("")` is 0, which would price an empty field as free.
  const major =
    typeof value === "number"
      ? value
      : /^\s*-?\d+(\.\d+)?\s*$/.test(value)
        ? Number(value)
        : NaN;
  if (!Number.isFinite(major)) return `${value} ${currency}`;

  return withFallback(
    () =>
      new Intl.NumberFormat(LOCALE_TAGS[locale], {
        style: "currency",
        currency,
      }).format(major),
    () => `${major.toFixed(2)} ${currency}`,
  );
}

export function formatDate(
  value: Date | string | number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const date = value instanceof Date ? value : new Date(value);

  return withFallback(
    () => new Intl.DateTimeFormat(LOCALE_TAGS[locale], options).format(date),
    () => date.toISOString().slice(0, 10),
  );
}

/**
 * Turkish dotted/dotless i rules differ from the invariant mapping, so text
 * comparisons (SEO keyword matching, search) must lowercase per locale.
 */
export function toLocaleLower(value: string, locale: Locale): string {
  return withFallback(
    () => value.toLocaleLowerCase(LOCALE_TAGS[locale]),
    () => value.toLowerCase(),
  );
}
