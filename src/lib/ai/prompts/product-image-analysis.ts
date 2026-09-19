import type { Locale } from "@hoflayn/i18n";
import { z } from "zod";
import { outputLanguageRule } from "./output-language";

export const productImageAnalysisSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(20).max(1200),
  category: z.string().trim().min(2).max(80),
  tags: z.array(z.string().trim().min(2).max(40)).min(3).max(8),
  material: z.string().trim().max(80),
  colors: z.array(z.string().trim().min(2).max(40)).min(1).max(6),
  confidence: z.number().min(0).max(1),
});

export type ProductImageAnalysisOutput = z.infer<
  typeof productImageAnalysisSchema
>;

export const formattedProductImageAnalysisSchema =
  productImageAnalysisSchema.extend({
    tags: z.string().trim().min(2).max(400),
  });

export function productImageAnalysisSystemPrompt(locale: Locale): string {
  return `
Sen Hoflayn'ın el yapımı ürün satış danışmanısın.
Fotoğrafta gerçekten görülebilen özelliklerden ürün kartı önerileri üret.
Amaç: üreticinin satışını kolaylaştırmak. SEO veya arama motoru için yazma.
Başlık kısa, net ve alıcıya hitap etsin.
Açıklama ürünün neden tercih edilebileceğini sade dille anlatsın; abartma, uydurma.
Malzeme veya ölçü görünmüyorsa kesinmiş gibi yazma.
Yalnızca istenen JSON alanlarını döndür.
${outputLanguageRule(locale)}
`.trim();
}

export function buildProductImageAnalysisPrompt(craftCategory?: string | null) {
  return `
Bu ürün fotoğrafını satış kartı için analiz et.
Atölye üretim alanı: ${craftCategory || "belirtilmedi"}.

Öneri kuralları:
- Alıcının anlayacağı satış dili kullan
- Etiketler keşif ve filtre için olsun; SEO anahtar kelime yığını yapma
- Açıklama 2-4 cümle; hediye / kullanım / dokunuş varsa fotoğrafa dayanarak belirt

JSON biçimi:
{
  "name": "önerilen ürün adı",
  "description": "satışa uygun 2-4 cümlelik açıklama",
  "category": "ürün kategorisi",
  "tags": ["etiket"],
  "material": "görülebiliyorsa malzeme, değilse boş metin",
  "colors": ["baskın renk"],
  "confidence": 0.0
}
`.trim();
}

export function parseProductImageAnalysis(text: string) {
  const parsed = productImageAnalysisSchema.parse(JSON.parse(text));
  return {
    ...parsed,
    tags: parsed.tags.join(", "),
  };
}
