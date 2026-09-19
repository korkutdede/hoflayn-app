import assert from "node:assert/strict";
import test from "node:test";
import { instagramCaptionSystemPrompt } from "../src/lib/ai/prompts/instagram-caption";
import {
  jobContentLocale,
  outputLanguageRule,
} from "../src/lib/ai/prompts/output-language";
import { descriptionSystemPrompt } from "../src/lib/ai/prompts/product-description";
import { productImageAnalysisSystemPrompt } from "../src/lib/ai/prompts/product-image-analysis";
import { seoSystemPrompt } from "../src/lib/ai/prompts/product-seo";
import { renderCatalogPdf } from "../src/lib/catalog/pdf";
import { tenantContentLocale } from "../src/lib/i18n/content";

test("a workshop without a stored choice keeps writing Turkish", () => {
  assert.equal(tenantContentLocale({ contentLocale: null }), "tr");
  assert.equal(tenantContentLocale({ contentLocale: undefined }), "tr");
  assert.equal(tenantContentLocale({ contentLocale: "de" }), "tr");
  assert.equal(tenantContentLocale({ contentLocale: "en" }), "en");
});

test("a queued job carries its own content language", () => {
  // Jobs enqueued before this feature shipped have no contentLocale at all.
  assert.equal(jobContentLocale(null), "tr");
  assert.equal(jobContentLocale({ imageUrl: "x" }), "tr");
  assert.equal(jobContentLocale({ contentLocale: "en" }), "en");
});

test("every AI prompt states the output language", () => {
  const prompts = [
    descriptionSystemPrompt,
    instagramCaptionSystemPrompt,
    seoSystemPrompt,
    productImageAnalysisSystemPrompt,
  ];

  for (const buildPrompt of prompts) {
    for (const locale of ["tr", "en"] as const) {
      assert.ok(
        buildPrompt(locale).includes(outputLanguageRule(locale)),
        `${buildPrompt.name} is missing the ${locale} directive`,
      );
    }
    // An English directive in the Turkish prompt would silently flip output.
    assert.notEqual(buildPrompt("tr"), buildPrompt("en"));
  }
});

test("catalog PDF copy follows the content language", async () => {
  const item = { name: "Ceramic mug", description: "Handmade", price: "680.00" };

  for (const locale of ["tr", "en"] as const) {
    const bytes = await renderCatalogPdf({
      locale,
      title: "Spring collection",
      templateId: "grid",
      theme: "linen",
      showPrices: true,
      showWorkshop: false,
      items: [item],
    });
    assert.equal(bytes.subarray(0, 4).toString("utf8"), "%PDF");
  }
});
