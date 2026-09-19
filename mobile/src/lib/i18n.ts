import {
  createTranslator,
  DEFAULT_LOCALE,
  type Locale,
  type Translator,
} from "@hoflayn/i18n";

export function deviceLocale(): Locale {
  return DEFAULT_LOCALE;
}

export function deviceTranslator(): Translator {
  return createTranslator(deviceLocale());
}

export function webOrigin(): string {
  return (
    process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") || "https://hoflayn.app"
  );
}
