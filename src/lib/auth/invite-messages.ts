import "server-only";
import type { MessageKey, Translator } from "@hoflayn/i18n";
import {
  supportEmailAddress,
  type InviteCheckFail,
} from "@/lib/auth/allowlist";

/**
 * `checkInviteEmail` stays pure and locale-free: it reports a stable code, and
 * the wording is chosen here, at the boundary where a locale is known. API
 * clients can translate the same codes themselves.
 */
const MESSAGE_KEYS: Record<InviteCheckFail["code"], MessageKey> = {
  invalid_email: "auth.error.invalidEmail",
  invite_closed: "beta.error.closed",
  invite_exhausted: "beta.error.exhausted",
  invite_required: "beta.error.notInvited",
};

export function inviteErrorMessage(
  code: InviteCheckFail["code"],
  t: Translator,
): string {
  return t(inviteMessageKey(code), { support: supportEmailAddress() });
}

export function inviteMessageKey(code: InviteCheckFail["code"]): MessageKey {
  return MESSAGE_KEYS[code];
}

/** Support address is interpolated into every invite message. */
export function inviteMessageVars() {
  return { support: supportEmailAddress() };
}

export function inviteErrorStatus(code: InviteCheckFail["code"]): number {
  return code === "invalid_email" ? 422 : 403;
}
