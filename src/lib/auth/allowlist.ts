/**
 * Soft closed-beta invite gate (email allowlist).
 * ALLOWLIST_EMAILS = comma-separated emails. Empty / unset → gate off (open).
 * BETA_SIGNUPS_CLOSED=true → all signups blocked.
 * BETA_MAX_TENANTS=N → block when tenant count >= N (exhausted).
 */

export type InviteGateMode = "open" | "allowlist" | "closed";

export type InviteCheckOk = {
  ok: true;
  status: "open" | "allowlisted";
};

/**
 * Reports a stable code, never prose: the gate is pure and locale-free, and
 * callers render the code via `inviteErrorMessage` in the caller's language.
 */
export type InviteCheckFail = {
  ok: false;
  code:
    | "invalid_email"
    | "invite_required"
    | "invite_closed"
    | "invite_exhausted";
};

export type InviteCheckResult = InviteCheckOk | InviteCheckFail;

export function parseAllowlistEmails(
  raw = process.env.ALLOWLIST_EMAILS,
): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowlistEnabled(
  raw = process.env.ALLOWLIST_EMAILS,
): boolean {
  return parseAllowlistEmails(raw).length > 0;
}

export function isSignupClosed(
  raw = process.env.BETA_SIGNUPS_CLOSED,
): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function parseBetaMaxTenants(
  raw = process.env.BETA_MAX_TENANTS,
): number | null {
  if (!raw || !raw.trim()) return null;
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export function supportEmailAddress(
  raw = process.env.SUPPORT_EMAIL,
): string {
  return raw?.trim() || "destek@hoflayn.app";
}

export function inviteGateMode(opts?: {
  allowlistRaw?: string;
  closedRaw?: string;
}): InviteGateMode {
  if (isSignupClosed(opts?.closedRaw)) return "closed";
  if (isAllowlistEnabled(opts?.allowlistRaw)) return "allowlist";
  return "open";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidInviteEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isEmailAllowlisted(
  email: string,
  allowlistRaw = process.env.ALLOWLIST_EMAILS,
): boolean {
  const list = parseAllowlistEmails(allowlistRaw);
  if (list.length === 0) return true;
  return list.includes(email.trim().toLowerCase());
}

/** Pure check (no DB). Pass `tenantCount` when capacity is enforced. */
export function checkInviteEmail(
  email: string,
  opts?: {
    allowlistRaw?: string;
    closedRaw?: string;
    maxTenantsRaw?: string;
    tenantCount?: number | null;
  },
): InviteCheckResult {
  const trimmed = email.trim();
  if (!trimmed || !isValidInviteEmail(trimmed)) {
    return { ok: false, code: "invalid_email" };
  }

  if (isSignupClosed(opts?.closedRaw)) {
    return { ok: false, code: "invite_closed" };
  }

  const maxTenants = parseBetaMaxTenants(opts?.maxTenantsRaw);
  if (
    maxTenants != null &&
    typeof opts?.tenantCount === "number" &&
    opts.tenantCount >= maxTenants
  ) {
    return { ok: false, code: "invite_exhausted" };
  }

  if (!isEmailAllowlisted(trimmed, opts?.allowlistRaw)) {
    return { ok: false, code: "invite_required" };
  }

  const list = parseAllowlistEmails(opts?.allowlistRaw);
  return {
    ok: true,
    status: list.length === 0 ? "open" : "allowlisted",
  };
}

