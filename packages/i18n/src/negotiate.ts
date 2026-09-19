import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALES,
  type Locale,
} from "./locales";

export type LocaleSource =
  | "override"
  | "cookie"
  | "user"
  | "accept-language"
  | "country"
  | "unsupported-language"
  | "default";

export type LocaleSignals = {
  /** One-off force, e.g. a `?lang=en` link. Beats everything else. */
  override?: string | null;
  /** The visitor's last explicit choice, carried in the locale cookie. */
  cookie?: string | null;
  /** Stored preference of a signed-in user (`users.locale`). */
  user?: string | null;
  /** Raw `Accept-Language` request header. */
  acceptLanguage?: string | null;
  /** ISO 3166-1 alpha-2 country from IP geolocation. */
  country?: string | null;
};

export type LocaleResolution = {
  locale: Locale;
  source: LocaleSource;
};

/**
 * Concrete language ranges the client asked for, best first. The `*` wildcard
 * is dropped: it means "anything goes", which is the absence of a preference
 * rather than a preference we failed to satisfy.
 */
function rankedLanguageTags(header: string | null | undefined): string[] {
  if (!header) return [];

  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="))
        ?.slice(2);
      const parsed = quality === undefined ? 1 : Number.parseFloat(quality);

      return {
        tag: tag.trim().toLowerCase(),
        quality: Number.isFinite(parsed) ? parsed : 0,
      };
    })
    .filter((range) => range.tag && range.tag !== "*" && range.quality > 0)
    .sort((a, b) => b.quality - a.quality)
    .map((range) => range.tag);
}

/**
 * Picks the highest-quality language range the client accepts that we support,
 * matching on the primary subtag so `en-GB` and `tr-CY` still resolve.
 */
export function parseAcceptLanguage(
  header: string | null | undefined,
): Locale | null {
  for (const tag of rankedLanguageTags(header)) {
    const primary = tag.split("-")[0];
    const match = LOCALES.find((locale) => locale === primary);
    if (match) return match;
  }

  return null;
}

/**
 * The workbench opens in Turkish. Browser language and IP country do not
 * switch the UI on first visit — makers are the audience, and an English
 * Chrome must not greet them in English.
 *
 * An explicit choice still wins: `?lang=`, the locale cookie, then
 * `users.locale`. English is only a switch, never a default.
 */
export function resolveLocale(signals: LocaleSignals = {}): LocaleResolution {
  const explicit: [LocaleSource, string | null | undefined][] = [
    ["override", signals.override],
    ["cookie", signals.cookie],
    ["user", signals.user],
  ];

  for (const [source, value] of explicit) {
    if (isLocale(value)) return { locale: value, source };
  }

  return { locale: DEFAULT_LOCALE, source: "default" };
}
