import { DEFAULT_CURRENCY } from "@hoflayn/calc";

/**
 * Offered in the settings picker. A curated list rather than free text: every
 * code here has to be one `Intl.NumberFormat` can render a symbol for.
 */
export const SUPPORTED_CURRENCIES = ["TRY", "USD", "EUR", "GBP"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** ISO 4217 codes are three ASCII letters; anything else can't reach `Intl`. */
function isCurrencyCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z]{3}$/.test(value);
}

export function tenantCurrency(tenant: { currency?: string | null }): string {
  return isCurrencyCode(tenant.currency)
    ? tenant.currency.toUpperCase()
    : DEFAULT_CURRENCY;
}

/**
 * Reads the currency frozen into a job's input. Prices in catalog and label
 * exports are snapshots, so their unit has to be a snapshot too — otherwise
 * switching the workshop's currency silently relabels old exports.
 */
export function jobCurrency(
  input: Record<string, unknown> | null | undefined,
): string {
  const raw = input?.currency;
  return isCurrencyCode(raw) ? raw.toUpperCase() : DEFAULT_CURRENCY;
}
