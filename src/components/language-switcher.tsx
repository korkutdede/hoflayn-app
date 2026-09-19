"use client";

import { LOCALES, type Locale } from "@hoflayn/i18n";
import { useTransition } from "react";
import {
  setContentLocalePreference,
  setLocalePreference,
} from "@/lib/i18n/actions";
import { useLocale, useTranslator } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

function LocaleToggle({
  active,
  onSelect,
  className,
  disabled = false,
}: {
  active: Locale;
  onSelect: (locale: Locale) => Promise<unknown>;
  className?: string;
  disabled?: boolean;
}) {
  const t = useTranslator();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white p-0.5",
        className,
      )}
    >
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          aria-current={locale === active ? "true" : undefined}
          disabled={disabled || pending || locale === active}
          onClick={() =>
            startTransition(async () => {
              await onSelect(locale);
            })
          }
          className={cn(
            "rounded px-2 py-1 text-xs font-medium transition-colors",
            locale === active
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100 disabled:opacity-50",
          )}
        >
          {t(`locale.${locale}`)}
        </button>
      ))}
    </div>
  );
}

export function LanguageSwitcher({ className }: { className?: string }) {
  return (
    <LocaleToggle
      active={useLocale()}
      onSelect={setLocalePreference}
      className={className}
    />
  );
}

/** Language of AI copy and exports — separate from the interface language. */
export function ContentLanguageSwitcher({
  active,
  readOnly = false,
}: {
  active: Locale;
  readOnly?: boolean;
}) {
  return (
    <LocaleToggle
      active={active}
      onSelect={setContentLocalePreference}
      disabled={readOnly}
    />
  );
}
