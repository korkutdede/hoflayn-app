import type { Locale } from "@hoflayn/i18n";
import { z } from "zod";
import { outputLanguageRule } from "./output-language";

export const productDescriptionSchema = z.object({
  title: z.string().min(1).max(160),
  shortDescription: z.string().min(1).max(320),
  longDescription: z.string().min(1).max(4000),
  bullets: z.array(z.string().min(1).max(200)).min(1).max(8),
  seoKeywords: z.array(z.string().min(1).max(80)).min(1).max(12),
});

export type ProductDescriptionOutput = z.infer<typeof productDescriptionSchema>;

export function descriptionSystemPrompt(locale: Locale): string {
  return `Sen Hoflayn AI yazarısın. El yapımı / butik üreticiler için satış odaklı ürün açıklaması yazarsın.
Sadece geçerli JSON döndür. Anahtarlar: title, shortDescription, longDescription, bullets (string dizisi), seoKeywords (string dizisi).
Abartılı iddialardan kaçın; malzeme ve hedef kitleyi dikkate al.
${outputLanguageRule(locale)}`;
}

export function buildDescriptionPrompt(input: {
  productName: string;
  category?: string | null;
  material?: string | null;
  features?: string | null;
  audience?: string | null;
}): string {
  return [
    `Ürün adı: ${input.productName}`,
    input.category ? `Kategori: ${input.category}` : null,
    input.material ? `Malzeme: ${input.material}` : null,
    input.features ? `Özellikler: ${input.features}` : null,
    input.audience ? `Hedef kitle: ${input.audience}` : null,
    "",
    "Yukarıdaki bilgilere göre JSON üret.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseProductDescription(
  raw: string,
): ProductDescriptionOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI çıktısı geçerli JSON değil");
  }
  return productDescriptionSchema.parse(parsed);
}
