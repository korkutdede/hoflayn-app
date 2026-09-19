/**
 * Sale void decision helpers (Loop 25).
 * Voided sales are excluded from analytics via status=completed filter.
 */

import type { MessageKey, MessageVars } from "@hoflayn/i18n";

export type VoidDecision =
  | { action: "void" }
  | { action: "noop_reused" }
  | { action: "conflict"; messageKey: MessageKey; vars: MessageVars };

export function decideSaleVoid(status: string): VoidDecision {
  if (status === "voided") {
    return { action: "noop_reused" };
  }
  if (status === "completed") {
    return { action: "void" };
  }
  return {
    action: "conflict",
    messageKey: "sales.error.voidConflict",
    vars: { status },
  };
}

export function saleVoidStockIdempotencyKey(
  saleId: string,
  lineId: string,
  requestKey?: string | null,
): string {
  const suffix = requestKey?.trim() ? `:${requestKey.trim()}` : "";
  return `sale-void:${saleId}:${lineId}${suffix}`;
}
