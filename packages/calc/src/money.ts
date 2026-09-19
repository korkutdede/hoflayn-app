/** Money helpers using integer minor units (e.g. kuruş). Avoid float math. */

import { CalcError } from "./error";

export type MoneyMinor = number;

/**
 * Used when a workshop predates `tenants.currency`. Every render path takes
 * the code explicitly so nothing silently labels dollars as lira.
 */
export const DEFAULT_CURRENCY = "TRY";

export function parseMoneyToMinor(
  value: string | number | null | undefined,
): MoneyMinor | null {
  if (value === null || value === undefined) return null;
  const raw = typeof value === "number" ? value.toString() : value.trim();
  if (!raw) return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) {
    throw new CalcError("calc.money.invalid", { raw });
  }
  const negative = raw.startsWith("-");
  const [whole, fraction = ""] = raw.replace("-", "").split(".");
  const minor =
    Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isInteger(minor)) {
    throw new CalcError("calc.money.invalid", { raw });
  }
  return negative ? -minor : minor;
}

export function requireMoneyToMinor(value: string | number): MoneyMinor {
  const parsed = parseMoneyToMinor(value);
  if (parsed === null) throw new CalcError("calc.money.required");
  return parsed;
}

export function formatMinor(minor: MoneyMinor): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function addMinor(...values: MoneyMinor[]): MoneyMinor {
  return values.reduce((sum, value) => sum + value, 0);
}

export function roundMinor(value: number): MoneyMinor {
  return Math.round(value);
}
