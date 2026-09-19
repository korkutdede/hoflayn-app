import assert from "node:assert/strict";
import test from "node:test";
import {
  checkInviteEmail,
  inviteGateMode,
  isAllowlistEnabled,
  isSignupClosed,
  parseAllowlistEmails,
  parseBetaMaxTenants,
} from "../src/lib/auth/allowlist";

test("parseAllowlistEmails trims and lowercases", () => {
  assert.deepEqual(parseAllowlistEmails(" A@B.com , c@D.com "), [
    "a@b.com",
    "c@d.com",
  ]);
  assert.deepEqual(parseAllowlistEmails("  "), []);
  assert.equal(isAllowlistEnabled(""), false);
  assert.equal(isAllowlistEnabled("a@b.com"), true);
});

test("open gate allows any valid email", () => {
  const result = checkInviteEmail("anyone@atelier.com", {
    allowlistRaw: "",
    closedRaw: "false",
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.status, "open");
});

test("allowlist rejects unknown email with invite_required", () => {
  const result = checkInviteEmail("stranger@x.com", {
    allowlistRaw: "davetli@atelier.com",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invite_required");
});

test("allowlist accepts listed email", () => {
  const result = checkInviteEmail("Davetli@Atelier.com", {
    allowlistRaw: "davetli@atelier.com",
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.status, "allowlisted");
});

test("invalid email code", () => {
  const result = checkInviteEmail("not-an-email", { allowlistRaw: "" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invalid_email");
});

test("closed signups block everyone", () => {
  assert.equal(isSignupClosed("true"), true);
  assert.equal(inviteGateMode({ closedRaw: "true" }), "closed");
  const result = checkInviteEmail("davetli@atelier.com", {
    allowlistRaw: "davetli@atelier.com",
    closedRaw: "true",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invite_closed");
});

test("exhausted capacity when tenantCount >= max", () => {
  assert.equal(parseBetaMaxTenants("10"), 10);
  const result = checkInviteEmail("davetli@atelier.com", {
    allowlistRaw: "davetli@atelier.com",
    maxTenantsRaw: "10",
    tenantCount: 10,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invite_exhausted");
});

test("capacity not exhausted below max", () => {
  const result = checkInviteEmail("davetli@atelier.com", {
    allowlistRaw: "davetli@atelier.com",
    maxTenantsRaw: "10",
    tenantCount: 9,
  });
  assert.equal(result.ok, true);
});

test("tenant/kod izolasyonu: allowlist is exact email membership", () => {
  const a = checkInviteEmail("a@atelier.com", {
    allowlistRaw: "a@atelier.com",
  });
  const b = checkInviteEmail("b@atelier.com", {
    allowlistRaw: "a@atelier.com",
  });
  assert.equal(a.ok, true);
  assert.equal(b.ok, false);
});
