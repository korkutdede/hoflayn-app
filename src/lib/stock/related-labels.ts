import type { MessageKey, Translator } from "@hoflayn/i18n";

/**
 * `stock_movements.related_type` is the wire format written by the services
 * that move stock; only its label is localized.
 */
const CAUSE_KEYS = {
  sale: "stock.cause.sale",
  sale_void: "stock.cause.saleVoid",
  sale_draft: "stock.cause.saleDraft",
} as const satisfies Record<string, MessageKey>;

/**
 * Describes why a movement exists. Returns an empty string for movements the
 * user created by hand with no note — there is nothing to explain.
 */
export function stockMovementCause(
  relatedType: string | null | undefined,
  t: Translator,
): string {
  if (!relatedType) return "";
  const key = CAUSE_KEYS[relatedType as keyof typeof CAUSE_KEYS];
  return key ? t(key) : "";
}
