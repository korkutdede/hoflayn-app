import "server-only";
import type { MessageKey, MessageVars } from "@hoflayn/i18n";
import { NextResponse } from "next/server";
import { LocalizedError } from "@/lib/i18n/error";
import { getLocale, getTranslator } from "@/lib/i18n/server";

const allowedOrigin =
  process.env.API_ALLOWED_ORIGIN ??
  (process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_APP_URL ?? "https://hoflayn.app"
    : "*");

const API_HEADERS = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept-Language",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

/**
 * `code` is the stable contract clients branch on; `messageKey` is rendered in
 * the caller's language so an older client can still show something sensible
 * for a code it doesn't recognize.
 */
export class ApiError extends Error {
  /**
   * Set only by `passthrough`. Prose from an upstream system that we cannot
   * translate, so it is returned verbatim instead of through the dictionary.
   */
  readonly rawMessage?: string;

  constructor(
    readonly status: number,
    readonly code: string,
    readonly messageKey: MessageKey,
    readonly vars?: MessageVars,
    readonly details?: unknown,
    rawMessage?: string,
  ) {
    super(rawMessage ?? messageKey);
    this.name = "ApiError";
    this.rawMessage = rawMessage;
  }

  /** Re-wraps a service error, keeping its message key and interpolations. */
  static from(
    status: number,
    code: string,
    error: LocalizedError,
    details?: unknown,
  ): ApiError {
    return new ApiError(status, code, error.messageKey, error.vars, details);
  }

  /** Escape hatch for messages produced outside our dictionary. */
  static passthrough(status: number, code: string, message: string): ApiError {
    return new ApiError(
      status,
      code,
      "api.error.internal",
      undefined,
      undefined,
      message,
    );
  }
}

export async function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    { ok: true as const, data },
    {
      status,
      headers: { ...API_HEADERS, "Content-Language": await getLocale() },
    },
  );
}

export async function apiFailure(error: unknown) {
  const [t, locale] = await Promise.all([getTranslator(), getLocale()]);
  const headers = { ...API_HEADERS, "Content-Language": locale };

  // A service error that reached the boundary unwrapped still deserves a
  // localized message; it only loses the route's more specific code.
  const apiError =
    error instanceof LocalizedError
      ? ApiError.from(400, "request_failed", error)
      : error;

  if (apiError instanceof ApiError) {
    return NextResponse.json(
      {
        ok: false as const,
        error: {
          code: apiError.code,
          message:
            apiError.rawMessage ?? t(apiError.messageKey, apiError.vars),
          details: apiError.details,
        },
      },
      { status: apiError.status, headers },
    );
  }

  console.error("Unhandled API error", error);
  return NextResponse.json(
    {
      ok: false as const,
      error: { code: "internal_error", message: t("api.error.internal") },
    },
    { status: 500, headers },
  );
}

export function apiOptions() {
  return new NextResponse(null, { status: 204, headers: API_HEADERS });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "api.error.invalidJson");
  }
}
