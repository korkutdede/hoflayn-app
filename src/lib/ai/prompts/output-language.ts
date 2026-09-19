import { DEFAULT_LOCALE, isLocale, type Locale } from "@hoflayn/i18n";

/**
 * Prompt instructions stay in Turkish — they are tuned and the model follows
 * them regardless of the requested output language. This directive is the one
 * line that decides what language the *result* is written in, so each locale
 * spells it out rather than templating a language name into a sentence.
 */
const OUTPUT_LANGUAGE_RULES: Record<Locale, string> = {
  tr: "Tüm çıktı metinlerini Türkçe yaz.",
  en: "Write every output string in English. Tüm çıktı metinlerini İngilizce yaz.",
};

export function outputLanguageRule(locale: Locale): string {
  return OUTPUT_LANGUAGE_RULES[locale];
}

/**
 * Content locale as persisted on the AI job. Falls back rather than throwing so
 * jobs enqueued before the field existed still run.
 */
export function jobContentLocale(
  input: Record<string, unknown> | null | undefined,
): Locale {
  const raw = input?.contentLocale;
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}
