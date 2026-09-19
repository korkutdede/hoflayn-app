import {
  createPluralTranslator,
  createTranslator,
  DEFAULT_LOCALE,
  type Locale,
  toLocaleLower,
} from "@hoflayn/i18n";
import { z } from "zod";
import { outputLanguageRule } from "../prompts/output-language";
import {
  getSeoChannelProfile,
  seoChannelIdSchema,
  type SeoChannelId,
} from "./channels";

export const seoSuggestionSchema = z.object({
  channel: seoChannelIdSchema,
  title: z.string().trim().min(1).max(120),
  metaDescription: z.string().trim().min(1).max(320),
  slug: z.string().trim().min(1).max(120),
  primaryKeyword: z.string().trim().min(1).max(80),
  secondaryKeywords: z.array(z.string().trim().min(1).max(80)).max(12),
});

export type SeoSuggestion = z.infer<typeof seoSuggestionSchema>;

export type SeoLengthCheck = {
  ok: boolean;
  length: number;
  min: number;
  max: number;
};

export type SeoAudit = {
  score: number;
  missing: string[];
  warnings: string[];
  checks: {
    titleLength: SeoLengthCheck;
    metaLength: SeoLengthCheck;
    slugFormat: { ok: boolean; value: string };
    keywordInTitle: { ok: boolean };
    keywordInMeta: { ok: boolean };
    keywordRepetition: { ok: boolean; repeats: string[] };
    secondaryCount: { ok: boolean; count: number; max: number };
  };
};

export function seoSystemPrompt(locale: Locale): string {
  return `Sen Hoflayn SEO yardımcısısın. El yapımı / butik ürünler için SEO önerileri üretirsin.
Sadece geçerli JSON döndür. Anahtarlar: title, metaDescription, slug, primaryKeyword, secondaryKeywords (string dizisi).
Slug ASCII, küçük harf, tire ile ayrılmış olsun (aksanlı harfleri ASCII'ye çevir). Abartılı keyword stuffing yapma.
Kanal limitlerine uy; gerçekçi ve satışa yardımcı ol.
${outputLanguageRule(locale)}`;
}

export function buildSeoPrompt(input: {
  channel: SeoChannelId;
  productName: string;
  category?: string | null;
  description?: string | null;
  tags?: string | null;
}): string {
  const profile = getSeoChannelProfile(input.channel);
  return [
    `Kanal: ${profile.label} (${profile.id})`,
    `Title uzunluk: ${profile.titleMin}-${profile.titleMax}`,
    `Meta uzunluk: ${profile.metaMin}-${profile.metaMax}`,
    `Slug max: ${profile.slugMax}`,
    `İkincil anahtar kelime max: ${profile.secondaryMax}`,
    `Not: ${profile.notes}`,
    "",
    `Ürün adı: ${input.productName}`,
    input.category ? `Kategori: ${input.category}` : null,
    input.description ? `Açıklama: ${input.description.slice(0, 1200)}` : null,
    input.tags ? `Etiketler: ${input.tags}` : null,
    "",
    "Yukarıdaki bilgilere göre JSON üret. channel alanını JSON'a yazma; sunucu ekler.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function normalizeSlug(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/Ş/g, "s")
    .replace(/İ/g, "i")
    .replace(/Ö/g, "o")
    .replace(/Ç/g, "c")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 120);
}

/**
 * Folded with the rules of the language the copy is written in: Turkish maps
 * `I` to `ı`, so folding English copy the Turkish way turns "Istanbul" into
 * "ıstanbul" and the keyword stops matching its own title.
 */
function includesKeyword(
  haystack: string,
  keyword: string,
  locale: Locale,
): boolean {
  const k = toLocaleLower(keyword.trim(), locale);
  if (!k) return false;
  return toLocaleLower(haystack, locale).includes(k);
}

function lengthCheck(
  value: string,
  min: number,
  max: number,
): SeoLengthCheck {
  const length = [...value].length;
  return { ok: length >= min && length <= max, length, min, max };
}

export function auditSeoSuggestion(
  suggestion: SeoSuggestion,
  locale: Locale = DEFAULT_LOCALE,
): SeoAudit {
  const t = createTranslator(locale);
  const profile = getSeoChannelProfile(suggestion.channel);
  const missing: string[] = [];
  const warnings: string[] = [];

  const titleLength = lengthCheck(
    suggestion.title,
    profile.titleMin,
    profile.titleMax,
  );
  const metaLength = lengthCheck(
    suggestion.metaDescription,
    profile.metaMin,
    profile.metaMax,
  );

  const normalizedSlug = normalizeSlug(suggestion.slug);
  const slugFormat = {
    ok:
      suggestion.slug === normalizedSlug &&
      normalizedSlug.length > 0 &&
      normalizedSlug.length <= profile.slugMax &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug),
    value: suggestion.slug,
  };

  const keywordInTitle = {
    ok: includesKeyword(suggestion.title, suggestion.primaryKeyword, locale),
  };
  const keywordInMeta = {
    ok: includesKeyword(
      suggestion.metaDescription,
      suggestion.primaryKeyword,
      locale,
    ),
  };

  const allKeywords = [
    suggestion.primaryKeyword,
    ...suggestion.secondaryKeywords,
  ]
    .map((k) => toLocaleLower(k.trim(), locale))
    .filter(Boolean);
  const seen = new Set<string>();
  const repeats: string[] = [];
  for (const key of allKeywords) {
    if (seen.has(key)) repeats.push(key);
    else seen.add(key);
  }
  const keywordRepetition = { ok: repeats.length === 0, repeats };

  const secondaryCount = {
    ok: suggestion.secondaryKeywords.length <= profile.secondaryMax,
    count: suggestion.secondaryKeywords.length,
    max: profile.secondaryMax,
  };

  if (!suggestion.title.trim()) missing.push("title");
  if (!suggestion.metaDescription.trim()) missing.push("metaDescription");
  if (!suggestion.slug.trim()) missing.push("slug");
  if (!suggestion.primaryKeyword.trim()) missing.push("primaryKeyword");

  if (!titleLength.ok) {
    warnings.push(
      t("seo.audit.titleLength", {
        length: titleLength.length,
        min: titleLength.min,
        max: titleLength.max,
      }),
    );
  }
  if (!metaLength.ok) {
    warnings.push(
      t("seo.audit.metaLength", {
        length: metaLength.length,
        min: metaLength.min,
        max: metaLength.max,
      }),
    );
  }
  if (!slugFormat.ok) {
    warnings.push(t("seo.audit.slugFormat"));
  }
  if (!keywordInTitle.ok) {
    warnings.push(t("seo.audit.keywordInTitle"));
  }
  if (!keywordInMeta.ok) {
    warnings.push(t("seo.audit.keywordInMeta"));
  }
  if (!keywordRepetition.ok) {
    warnings.push(
      t("seo.audit.keywordRepetition", { keywords: repeats.join(", ") }),
    );
  }
  if (!secondaryCount.ok) {
    warnings.push(
      createPluralTranslator(locale)(
        "seo.audit.secondaryCount",
        secondaryCount.count,
        { max: secondaryCount.max },
      ),
    );
  }

  let score = 100;
  score -= missing.length * 20;
  if (!titleLength.ok) score -= 15;
  if (!metaLength.ok) score -= 15;
  if (!slugFormat.ok) score -= 15;
  if (!keywordInTitle.ok) score -= 10;
  if (!keywordInMeta.ok) score -= 10;
  if (!keywordRepetition.ok) score -= 10;
  if (!secondaryCount.ok) score -= 5;
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    missing,
    warnings,
    checks: {
      titleLength,
      metaLength,
      slugFormat,
      keywordInTitle,
      keywordInMeta,
      keywordRepetition,
      secondaryCount,
    },
  };
}

export function parseSeoSuggestion(
  raw: string,
  channel: SeoChannelId,
): SeoSuggestion {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI çıktısı geçerli JSON değil");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI çıktısı nesne değil");
  }
  const body = parsed as Record<string, unknown>;
  const slugRaw =
    typeof body.slug === "string" ? normalizeSlug(body.slug) : "";
  const secondary = Array.isArray(body.secondaryKeywords)
    ? body.secondaryKeywords.filter((x): x is string => typeof x === "string")
    : [];
  return seoSuggestionSchema.parse({
    channel,
    title: body.title,
    metaDescription: body.metaDescription,
    slug: slugRaw,
    primaryKeyword: body.primaryKeyword,
    secondaryKeywords: secondary.slice(
      0,
      getSeoChannelProfile(channel).secondaryMax,
    ),
  });
}

export function finalizeSeoSuggestion(
  suggestion: SeoSuggestion,
  locale: Locale = DEFAULT_LOCALE,
): {
  suggestion: SeoSuggestion;
  audit: SeoAudit;
} {
  const normalized: SeoSuggestion = {
    ...suggestion,
    slug: normalizeSlug(suggestion.slug),
    secondaryKeywords: suggestion.secondaryKeywords
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, getSeoChannelProfile(suggestion.channel).secondaryMax),
  };
  return {
    suggestion: seoSuggestionSchema.parse(normalized),
    audit: auditSeoSuggestion(normalized, locale),
  };
}
