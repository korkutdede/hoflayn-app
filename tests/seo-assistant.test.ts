import assert from "node:assert/strict";
import test from "node:test";
import { applySeoInputSchema } from "../src/lib/ai/seo/schemas";
import { CREDIT_COSTS } from "../src/lib/credits/costs";
import { ESTIMATED_COST_USD } from "../src/lib/ai/cost-model";
import {
  auditSeoSuggestion,
  finalizeSeoSuggestion,
  normalizeSlug,
  parseSeoSuggestion,
} from "../src/lib/ai/seo/audit";
import { getSeoChannelProfile } from "../src/lib/ai/seo/channels";

test("analyze_seo credit cost and estimate are wired", () => {
  assert.equal(CREDIT_COSTS.analyze_seo, 2);
  assert.equal(ESTIMATED_COST_USD.analyze_seo, 0.002);
});

test("slug normalizes Turkish characters", () => {
  assert.equal(normalizeSlug("El Yapımı Kupa!"), "el-yapimi-kupa");
  assert.equal(normalizeSlug("  Şömine--Vazo  "), "somine-vazo");
});

test("seo audit scores length and keyword rules for generic_web", () => {
  const profile = getSeoChannelProfile("generic_web");
  const good = finalizeSeoSuggestion({
    channel: "generic_web",
    title: "El yapımı seramik kupa atölyeden",
    metaDescription:
      "El yapımı seramik kupa, günlük kahve için atölyeden doğrudan. Dayanıklı ve hediyelik.",
    slug: "el-yapimi-seramik-kupa",
    primaryKeyword: "el yapımı",
    secondaryKeywords: ["seramik", "kupa"],
  });
  assert.ok(good.audit.score >= 70);
  assert.equal(good.audit.checks.titleLength.ok, true);
  assert.ok(good.suggestion.title.length <= profile.titleMax);

  const weak = auditSeoSuggestion({
    channel: "generic_web",
    title: "Kısa",
    metaDescription: "çok kısa",
    slug: "Bad Slug!",
    primaryKeyword: "seramik",
    secondaryKeywords: ["seramik", "seramik"],
  });
  assert.ok(weak.score < 70);
  assert.ok(weak.warnings.length > 0);
  assert.equal(weak.checks.keywordRepetition.ok, false);
});

test("parseSeoSuggestion attaches channel and normalizes slug", () => {
  const parsed = parseSeoSuggestion(
    JSON.stringify({
      title: "Hoflayn Web el yapımı vazo dekor",
      metaDescription:
        "Hoflayn Web için el yapımı vazo önerisi. Atölye üretimi, hediyelik ve dekoratif kullanım.",
      slug: "El Yapımı Vazo",
      primaryKeyword: "el yapımı",
      secondaryKeywords: ["vazo", "dekor"],
    }),
    "hoflayn_web",
  );
  assert.equal(parsed.channel, "hoflayn_web");
  assert.equal(parsed.slug, "el-yapimi-vazo");
});

test("apply schema requires at least one field and rejects member-only empty apply", () => {
  assert.throws(() =>
    applySeoInputSchema.parse({
      suggestion: {
        channel: "generic_web",
        title: "El yapımı seramik kupa atölyeden",
        metaDescription:
          "El yapımı seramik kupa, günlük kahve için atölyeden doğrudan. Dayanıklı ve hediyelik.",
        slug: "el-yapimi-seramik-kupa",
        primaryKeyword: "el yapımı",
        secondaryKeywords: ["seramik"],
      },
      apply: {},
    }),
  );

  const ok = applySeoInputSchema.parse({
    suggestion: {
      channel: "generic_web",
      title: "El yapımı seramik kupa atölyeden",
      metaDescription:
        "El yapımı seramik kupa, günlük kahve için atölyeden doğrudan. Dayanıklı ve hediyelik.",
      slug: "el-yapimi-seramik-kupa",
      primaryKeyword: "el yapımı",
      secondaryKeywords: ["seramik"],
    },
    apply: { title: true },
  });
  assert.equal(ok.apply.title, true);
  assert.equal(ok.apply.slug, false);
});
