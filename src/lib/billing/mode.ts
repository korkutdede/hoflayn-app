/**
 * Stripe test vs live mode helpers.
 * Mode is inferred from STRIPE_SECRET_KEY prefix (sk_test_ / sk_live_).
 * Optional STRIPE_MODE env must match the key when both are set.
 */

export type StripeMode = "test" | "live" | "unconfigured";

export function getStripeSecretKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.trim()) return null;
  return key.trim();
}

export function detectStripeMode(key = getStripeSecretKey()): StripeMode {
  if (!key) return "unconfigured";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  // Unknown prefix — treat as misconfigured until cutover docs say otherwise.
  return "unconfigured";
}

export function declaredStripeMode(): StripeMode | null {
  const raw = process.env.STRIPE_MODE?.trim().toLowerCase();
  if (raw === "test" || raw === "live") return raw;
  return null;
}

function appLooksLocal(): boolean {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    process.env.NODE_ENV === "development"
  );
}

export type StripeModeCheck = {
  mode: StripeMode;
  ok: boolean;
  error?: string;
};

/**
 * Validates key/mode consistency and blocks accidental live keys on local/dev
 * unless ALLOW_STRIPE_LIVE=true.
 */
export function assertStripeModeSafe(): StripeModeCheck {
  const key = getStripeSecretKey();
  const mode = detectStripeMode(key);
  const declared = declaredStripeMode();

  if (mode === "unconfigured") {
    if (!key) {
      return { mode, ok: true }; // billing simply disabled
    }
    return {
      mode,
      ok: false,
      error:
        "STRIPE_SECRET_KEY must start with sk_test_ or sk_live_. See docs/STRIPE_CUTOVER.md.",
    };
  }

  if (declared && declared !== mode) {
    return {
      mode,
      ok: false,
      error: `STRIPE_MODE=${declared} but key is ${mode}. Align env before cutover.`,
    };
  }

  if (mode === "live" && appLooksLocal() && process.env.ALLOW_STRIPE_LIVE !== "true") {
    return {
      mode,
      ok: false,
      error:
        "Live Stripe key detected on local/dev. Set ALLOW_STRIPE_LIVE=true only if intentional.",
    };
  }

  return { mode, ok: true };
}

/** Throws BillingConfigurationError-compatible Error when unsafe. */
export function requireStripeModeSafe(): StripeMode {
  const check = assertStripeModeSafe();
  if (!check.ok) {
    throw new Error(check.error ?? "Stripe mode unsafe");
  }
  if (check.mode === "unconfigured") {
    throw new Error("Stripe yapılandırılmamış: STRIPE_SECRET_KEY eksik.");
  }
  return check.mode;
}
