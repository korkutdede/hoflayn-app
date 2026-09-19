import assert from "node:assert/strict";
import test from "node:test";
import {
  createPluralTranslator,
  formatMoneyDecimal,
  toLocaleLower,
} from "../packages/i18n/src/index";
import { auditSeoSuggestion } from "../src/lib/ai/seo/audit";
import { stockMovementCause } from "../src/lib/stock/related-labels";
import { jobCurrency, tenantCurrency } from "../src/lib/tenant/currency";
import { defaultTenantName } from "../src/lib/tenant/slug";
import { createTranslator } from "../packages/i18n/src/index";

test("case folding follows the language of the text", () => {
  // Turkish maps I to the dotless ı; English must not.
  assert.equal(toLocaleLower("ISTANBUL", "tr"), "ıstanbul");
  assert.equal(toLocaleLower("ISTANBUL", "en"), "istanbul");
});

test("an English keyword matches its own English title", () => {
  const suggestion = {
    channel: "generic_web" as const,
    title: "Istanbul Ceramics Handmade Mug",
    metaDescription:
      "A handmade mug from our Istanbul ceramics studio, finished by hand.",
    slug: "istanbul-ceramics-handmade-mug",
    primaryKeyword: "istanbul ceramics",
    secondaryKeywords: ["handmade mug"],
  };

  const english = auditSeoSuggestion(suggestion, "en");
  assert.equal(english.checks.keywordInTitle.ok, true);
  assert.equal(english.checks.keywordInMeta.ok, true);

  // The same copy audited with Turkish folding is what used to happen; the
  // point of passing the locale is that these two can now disagree.
  const turkish = auditSeoSuggestion(suggestion, "tr");
  assert.equal(turkish.checks.keywordInTitle.ok, false);
});

test("prices carry the workshop's currency, not a baked-in symbol", () => {
  assert.match(formatMoneyDecimal("680.00", "TRY", "tr"), /680,00/);
  assert.match(formatMoneyDecimal("680.00", "USD", "en"), /680\.00/);
  assert.ok(formatMoneyDecimal("680.00", "USD", "en").includes("$"));
  assert.ok(!formatMoneyDecimal("680.00", "USD", "en").includes("₺"));

  // A blank or malformed price must not render as "NaN" — or worse, as free.
  assert.equal(formatMoneyDecimal("", "USD", "en"), " USD");
  assert.equal(formatMoneyDecimal("n/a", "USD", "en"), "n/a USD");
  assert.equal(formatMoneyDecimal("0", "USD", "en"), "$0.00");
});

test("currency falls back only when the stored value is unusable", () => {
  assert.equal(tenantCurrency({ currency: "usd" }), "USD");
  assert.equal(tenantCurrency({ currency: null }), "TRY");
  assert.equal(tenantCurrency({ currency: "dollars" }), "TRY");
  // Exports freeze their currency, so old jobs keep rendering their own unit.
  assert.equal(jobCurrency({ currency: "EUR" }), "EUR");
  assert.equal(jobCurrency(null), "TRY");
});

test("English pluralizes, Turkish does not inflect after a numeral", () => {
  const en = createPluralTranslator("en");
  const tr = createPluralTranslator("tr");

  assert.equal(en("catalog.pdf.itemCount", 1), "1 product");
  assert.equal(en("catalog.pdf.itemCount", 7), "7 products");
  assert.equal(en("dashboard.usage.title", 1), "Last 1 day");
  assert.equal(en("dashboard.usage.title", 7), "Last 7 days");

  assert.equal(tr("catalog.pdf.itemCount", 1), "1 ürün");
  assert.equal(tr("catalog.pdf.itemCount", 7), "7 ürün");
});

test("extra variables reach a plural message alongside the count", () => {
  const en = createPluralTranslator("en");
  assert.equal(
    en("seo.audit.secondaryCount", 1, { max: 5 }),
    "There is 1 secondary keyword; the maximum is 5.",
  );
});

test("a workshop gets its default name in the visitor's language", () => {
  const tr = createTranslator("tr");
  const en = createTranslator("en");

  assert.equal(defaultTenantName("a@b.com", "Ayşe", tr), "Ayşe Atölyesi");
  assert.equal(defaultTenantName("a@b.com", "Ayse", en), "Ayse's Workshop");
  // No name given: fall back to the email handle, still localized.
  assert.equal(defaultTenantName("mika@b.com", null, en), "mika's Workshop");
  assert.equal(defaultTenantName("@b.com", null, en), "My Workshop");
});

test("system stock movements are labelled at read time, not write time", () => {
  const tr = createTranslator("tr");
  const en = createTranslator("en");

  assert.equal(stockMovementCause("sale", en), "Sale");
  assert.equal(stockMovementCause("sale", tr), "Satış");
  assert.equal(stockMovementCause("sale_void", en), "Sale voided");
  // A hand-entered movement has no cause to explain.
  assert.equal(stockMovementCause(null, en), "");
  assert.equal(stockMovementCause("something_new", en), "");
});
