import type { MessageKey, MessageVars } from "@hoflayn/i18n";

/**
 * An error whose user-facing text is a dictionary key rather than prose, so the
 * layer that answers the request can render it in the caller's language.
 *
 * Services throw these; route handlers and server actions translate them. The
 * inherited `message` holds the key and exists only for logs and stack traces —
 * never show it to a user.
 */
export class LocalizedError extends Error {
  constructor(
    readonly messageKey: MessageKey,
    readonly vars?: MessageVars,
  ) {
    super(messageKey);
    this.name = "LocalizedError";
  }
}

export function isLocalizedError(error: unknown): error is LocalizedError {
  return error instanceof LocalizedError;
}
