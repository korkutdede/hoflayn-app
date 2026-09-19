import { DEFAULT_LOCALE, isLocale, type Locale } from "@hoflayn/i18n";

/**
 * Language for generated content: AI copy, catalog and label exports.
 *
 * Deliberately independent of the UI locale — a maker can run the app in
 * English while selling into the Turkish market, so the interface and the
 * product copy are different decisions.
 */
export function tenantContentLocale(tenant: {
  contentLocale?: string | null;
}): Locale {
  return isLocale(tenant.contentLocale) ? tenant.contentLocale : DEFAULT_LOCALE;
}
