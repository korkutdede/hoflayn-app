import type { MessageKey, MessageVars } from "@hoflayn/i18n";

/**
 * Locale-free calculator error. Callers translate `messageKey` at the edge
 * (API, server action, or mobile screen).
 */
export class CalcError extends Error {
  constructor(
    readonly messageKey: MessageKey,
    readonly vars?: MessageVars,
  ) {
    super(messageKey);
    this.name = "CalcError";
  }
}

export function isCalcError(error: unknown): error is CalcError {
  return error instanceof CalcError;
}
