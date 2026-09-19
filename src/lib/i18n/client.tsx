"use client";

import {
  createPluralTranslator,
  createTranslator,
  type Dictionary,
  type Locale,
  type PluralTranslator,
  type Translator,
} from "@hoflayn/i18n";
import { createContext, useContext, useMemo, type ReactNode } from "react";

type LocaleContextValue = {
  locale: Locale;
  dictionary: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Carries the active locale into Client Components. Only the negotiated
 * dictionary crosses the boundary, so the unused language never reaches the
 * browser; split the catalog per route if it outgrows a single payload.
 */
export function LocaleProvider({
  locale,
  dictionary,
  children,
}: LocaleContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ locale, dictionary }), [locale, dictionary]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

function useLocaleContext(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale must be used inside a LocaleProvider");
  }
  return value;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}

export function useTranslator(): Translator {
  const { dictionary } = useLocaleContext();
  return useMemo(() => createTranslator(dictionary), [dictionary]);
}

/** For countable messages, where English needs "1 day" but "2 days". */
export function usePluralTranslator(): PluralTranslator {
  const { locale, dictionary } = useLocaleContext();
  return useMemo(
    () => createPluralTranslator(locale, dictionary),
    [locale, dictionary],
  );
}
