import { en } from "./dictionaries/en";
import { tr } from "./dictionaries/tr";
import type { Dictionary, MessageKey } from "./dictionaries/types";
import { LOCALE_TAGS, type Locale } from "./locales";

const DICTIONARIES: Record<Locale, Dictionary> = { tr, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type MessageVars = Record<string, string | number>;

export type Translator = (key: MessageKey, vars?: MessageVars) => string;

/** Replaces `{name}` placeholders; unknown placeholders are left in place. */
export function interpolate(template: string, vars?: MessageVars): string {
  if (!vars) return template;

  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in vars ? String(vars[name]) : placeholder,
  );
}

/**
 * Accepts a locale on the server, or a dictionary on the client where the
 * active catalog arrives as a prop instead of being imported.
 */
export function createTranslator(source: Locale | Dictionary): Translator {
  const dictionary =
    typeof source === "string" ? getDictionary(source) : source;

  return (key, vars) => interpolate(dictionary[key] ?? key, vars);
}

/**
 * Base of a countable message, i.e. a key authored as a `.one` / `.other`
 * pair. Distributes over the `MessageKey` union so only real plural families
 * are accepted.
 */
type PluralBase<K extends string> = K extends `${infer B}.other` ? B : never;

export type PluralMessageKey = PluralBase<MessageKey>;

export type PluralTranslator = (
  key: PluralMessageKey,
  count: number,
  vars?: MessageVars,
) => string;

/**
 * Picks the plural form for `count`. Both locales need the pair even though
 * Turkish never inflects the noun after a numeral — writing it out keeps the
 * dictionaries symmetrical and the parity test meaningful.
 *
 * The locale is required alongside the dictionary because plural categories
 * come from the locale, not from the catalog the client was handed.
 */
export function createPluralTranslator(
  locale: Locale,
  dictionary: Dictionary = getDictionary(locale),
): PluralTranslator {
  let rules: Intl.PluralRules | null = null;
  try {
    rules = new Intl.PluralRules(LOCALE_TAGS[locale]);
  } catch {
    // Hermes without full ICU: fall back to the "other" form everywhere.
  }

  return (key, count, vars) => {
    const category = rules ? rules.select(count) : "other";
    const template =
      dictionary[`${key}.${category}` as MessageKey] ??
      dictionary[`${key}.other` as MessageKey];

    return interpolate(template ?? key, { count, ...vars });
  };
}
