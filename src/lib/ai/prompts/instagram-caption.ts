import type { Locale } from "@hoflayn/i18n";
import { z } from "zod";
import { outputLanguageRule } from "./output-language";

export const captionToneSchema = z.enum(["samimi", "hikaye", "sade"]);
export type CaptionTone = z.infer<typeof captionToneSchema>;

export const instagramCaptionSchema = z.object({
  caption: z.string().min(20).max(1800),
  callToAction: z.string().min(2).max(240),
  hashtags: z.array(z.string().min(2).max(80)).min(3).max(15),
});

export type InstagramCaptionOutput = z.infer<typeof instagramCaptionSchema>;

export function instagramCaptionSystemPrompt(locale: Locale): string {
  return `Sen Hoflayn AI sosyal medya yazarısın.
El yapımı ve butik üreticiler için doğal, satış baskısı kurmayan Instagram metni yazarsın.
Yalnızca geçerli JSON döndür. Anahtarlar: caption, callToAction, hashtags (string dizisi).
Bilgi uydurma; emoji kullanımını ölçülü tut; hashtag'leri # ile başlat ve aksanlı/Türkçe karakter kullanma.
${outputLanguageRule(locale)}`;
}

export function buildInstagramCaptionPrompt(input: {
  productName: string;
  category?: string | null;
  description?: string | null;
  tags?: string | null;
  tone: CaptionTone;
}): string {
  const toneHint: Record<CaptionTone, string> = {
    samimi: "Sıcak, samimi ve atölyeden konuşan",
    hikaye: "Ürünün emeğini ve hikâyesini öne çıkaran",
    sade: "Kısa, temiz ve doğrudan",
  };

  return [
    `Ürün adı: ${input.productName}`,
    input.category ? `Kategori: ${input.category}` : null,
    input.description ? `Ürün açıklaması: ${input.description}` : null,
    input.tags ? `Mevcut etiketler: ${input.tags}` : null,
    `Ton: ${toneHint[input.tone]}`,
    "",
    "Tek bir Instagram gönderisi için JSON üret. Caption ve çağrı metnini ayrı alanlarda tut.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseInstagramCaption(raw: string): InstagramCaptionOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI caption çıktısı geçerli JSON değil");
  }

  const output = instagramCaptionSchema.parse(parsed);
  return {
    ...output,
    hashtags: output.hashtags.map((tag) =>
      tag.startsWith("#") ? tag : `#${tag}`,
    ),
  };
}

export function formatInstagramCaption(output: InstagramCaptionOutput): string {
  return [
    output.caption.trim(),
    output.callToAction.trim(),
    "",
    output.hashtags.join(" "),
  ].join("\n\n");
}
