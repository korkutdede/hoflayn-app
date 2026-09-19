import { isLocale, resolveLocale, type LocaleResolution } from "@hoflayn/i18n";
import { NextResponse, type NextRequest } from "next/server";
import {
  COUNTRY_HEADER,
  LOCALE_COOKIE,
  LOCALE_COOKIE_OPTIONS,
  LOCALE_QUERY_PARAM,
} from "./cookie";

/**
 * The country header only exists on Vercel, so local development can simulate
 * a visitor's location with LOCALE_DEBUG_COUNTRY.
 */
function requestCountry(request: NextRequest): string | null {
  return (
    request.headers.get(COUNTRY_HEADER) ??
    process.env.LOCALE_DEBUG_COUNTRY ??
    null
  );
}

export function detectLocale(request: NextRequest): LocaleResolution {
  return resolveLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get("accept-language"),
    country: requestCountry(request),
  });
}

/**
 * Turns `?lang=en` into a persisted choice and a clean URL. The redirect is what
 * makes the override take effect on the current page: the proxy can only write
 * the cookie to the response, so the render happening on this same request
 * would otherwise still see the previous locale.
 */
export function localeOverrideRedirect(
  request: NextRequest,
): NextResponse | null {
  const override = request.nextUrl.searchParams.get(LOCALE_QUERY_PARAM);
  if (!isLocale(override)) return null;

  const target = request.nextUrl.clone();
  target.searchParams.delete(LOCALE_QUERY_PARAM);

  const response = NextResponse.redirect(target);
  response.cookies.set(LOCALE_COOKIE, override, LOCALE_COOKIE_OPTIONS);
  return response;
}

/**
 * Persists the negotiated locale so later requests skip negotiation entirely.
 * The durable record is `users.locale`; this cookie is how it travels, and how
 * anonymous visitors keep their language across sessions.
 */
export function attachLocale(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  // API clients (mobile) authenticate with a bearer token and send
  // Accept-Language on every call, so they have no use for the cookie.
  if (request.nextUrl.pathname.startsWith("/api")) return response;

  const { locale } = detectLocale(request);
  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
  }

  return response;
}
