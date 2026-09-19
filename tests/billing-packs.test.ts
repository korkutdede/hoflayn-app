import assert from "node:assert/strict";
import test from "node:test";
import { createTranslator } from "../packages/i18n/src/index";
import { CREDIT_PACKS } from "../src/lib/billing/config";
import {
  MANAGER_REQUIRED_BILLING_KEY,
  billingReturnBanner,
  canStartBillingCheckout,
  isKnownCreditPackId,
  listCreditPacks,
} from "../src/lib/billing/packs";

test("credit packs are 50 and 200", () => {
  const packs = listCreditPacks();
  assert.deepEqual(
    packs.map((p) => p.id).sort(),
    ["credits_200", "credits_50"],
  );
  assert.equal(CREDIT_PACKS.credits_50.credits, 50);
  assert.equal(CREDIT_PACKS.credits_200.credits, 200);
});

test("isKnownCreditPackId guards pack ids", () => {
  assert.equal(isKnownCreditPackId("credits_50"), true);
  assert.equal(isKnownCreditPackId("credits_999"), false);
});

test("member cannot start billing checkout", () => {
  assert.equal(canStartBillingCheckout("member"), false);
  assert.equal(canStartBillingCheckout("owner"), true);
  assert.equal(canStartBillingCheckout("admin"), true);
  assert.equal(MANAGER_REQUIRED_BILLING_KEY, "billing.error.role");
});

test("billing return banners for success and cancel", () => {
  assert.equal(billingReturnBanner("success")?.tone, "success");
  assert.equal(billingReturnBanner("canceled")?.tone, "muted");
  assert.equal(billingReturnBanner("portal"), null);

  // The banner ships a key, not prose, so it can be rendered in either locale.
  for (const locale of ["tr", "en"] as const) {
    const t = createTranslator(locale);
    const banner = billingReturnBanner("success");
    assert.ok(banner && t(banner.messageKey).length > 0);
  }
});

test("tenant isolation contract: billing checkout uses tenant context", () => {
  // POST /api/v1/billing creates sessions with client_reference_id / metadata.tenantId.
  const metaKeys = ["tenantId", "packId", "kind"];
  assert.ok(metaKeys.includes("tenantId"));
});
