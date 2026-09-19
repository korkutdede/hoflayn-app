/** Shared between the proxy (writes) and server code (reads). */
export const LOCALE_COOKIE = "hoflayn_locale";

/** `?lang=en` forces and persists a locale; used for testing and email links. */
export const LOCALE_QUERY_PARAM = "lang";

/** Vercel resolves this from the client IP at the edge — no GeoIP vendor needed. */
export const COUNTRY_HEADER = "x-vercel-ip-country";

export const LOCALE_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
} as const;
