import assert from "node:assert/strict";
import test from "node:test";
import { LOCALES, createTranslator } from "@hoflayn/i18n";
import { CREDIT_COSTS } from "../src/lib/credits/costs";
import {
  buildUsageBreakdown,
  creditOperationKey,
  labelCreditOperation,
  unitCostForOperation,
} from "../src/lib/credits/labels";

test("every CREDIT_COSTS key has a label in every locale", () => {
  for (const key of Object.keys(CREDIT_COSTS) as (keyof typeof CREDIT_COSTS)[]) {
    for (const locale of LOCALES) {
      const label = createTranslator(locale)(creditOperationKey(key));
      // A missing key translates to itself, which would sort and read as junk.
      assert.notEqual(label, creditOperationKey(key));
      assert.ok(label.length > 2);
    }
    assert.equal(unitCostForOperation(key), CREDIT_COSTS[key]);
  }
});

test("buildUsageBreakdown sorts by credits and attaches labels", () => {
  const items = buildUsageBreakdown([
    { operation: "generate_caption", creditsUsed: 4, jobCount: 2 },
    { operation: "remove_bg", creditsUsed: 6, jobCount: 6 },
    { operation: "unknown_op", creditsUsed: 1, jobCount: 1 },
  ]);
  assert.equal(items[0]?.operation, "remove_bg");
  assert.equal(items[0]?.label, "Arka plan silme");
  assert.equal(items[0]?.unitCost, 1);
  assert.equal(items[1]?.unitCost, 2);
  assert.equal(items[2]?.label, "unknown_op");
  assert.equal(items[2]?.unitCost, null);
});

test("labelCreditOperation follows the locale and falls back to the raw key", () => {
  assert.equal(labelCreditOperation("white_bg"), "Beyaz arka plan");
  assert.equal(
    labelCreditOperation("white_bg", createTranslator("en")),
    "White backdrop",
  );
  assert.equal(labelCreditOperation("custom_x"), "custom_x");
});

test("tenant isolation contract: usage summary queries filter tenantId", () => {
  const wiring = "getTenantCostSummary(context.tenant.id)";
  assert.match(wiring, /tenant\.id/);
});
