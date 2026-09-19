import {
  type TextGenerateInput,
  type TextGenerateResult,
  type TextProvider,
} from "../types";

/**
 * Deterministic mock writer for local/dev when OPENAI_API_KEY is absent.
 */
export class MockTextProvider implements TextProvider {
  readonly id = "mock";

  async generateText(input: TextGenerateInput): Promise<TextGenerateResult> {
    await new Promise((r) => setTimeout(r, 120));
    const hint =
      typeof input.options?.productName === "string"
        ? input.options.productName
        : "Bu ürün";

    const isCaption = input.options?.operation === "generate_caption";
    const isImageAnalysis =
      input.options?.operation === "analyze_product_image";
    const isSeo = input.options?.operation === "analyze_seo";
    const output = isImageAnalysis
      ? {
          name: "El Yapımı Ürün",
          description:
            "Fotoğraftaki ürün, sade formu ve el işçiliğini hissettiren yüzey detaylarıyla öne çıkıyor. Günlük kullanım veya özel bir hediye alternatifi olarak değerlendirilebilir. Malzeme ve ölçü bilgilerini kontrol ederek bu taslağı tamamlayabilirsin.",
          category:
            typeof input.options?.craftCategory === "string"
              ? input.options.craftCategory
              : "El yapımı ürün",
          tags: ["el yapımı", "butik üretim", "tasarım", "hediyelik"],
          material: "",
          colors: ["doğal tonlar"],
          confidence: 0.55,
        }
      : isSeo
        ? {
            title: "El yapimi butik urun atolyeden",
            metaDescription:
              "El yapimi butik urun, atolye emegiyle hazirlandi. Gunluk kullanim ve hediyelik icin uygun, dogrudan ureticiden.",
            slug: "el-yapimi-butik-urun",
            primaryKeyword: "el yapimi",
            secondaryKeywords: ["butik", "atolye", "hediyelik"],
          }
      : isCaption
        ? {
      caption: `${hint}, atölyemizde emeğin ve küçük detayların değerine inanarak hazırlandı. Her parça kendine özgü izler taşıyor. ✨`,
      callToAction: "Detayları keşfetmek için bize mesaj gönderebilirsin.",
      hashtags: [
        "#elYapimi",
        "#butikUretim",
        "#atolye",
        "#tasarim",
        "#hediye",
      ],
          }
        : {
            title: hint,
            shortDescription: `${hint} — el işçiliğiyle üretilmiş, atölye sıcaklığını yansıtan bir parça.`,
            longDescription: `${hint}, özenle seçilmiş malzemeler ve geleneksel tekniklerle hazırlanır. Her parça küçük farklar taşır; bu da onu seri üretimden ayırır. Günlük kullanımda dayanıklı, vitrinde ise dikkat çekici bir duruş sergiler.`,
            bullets: [
              "El yapımı üretim",
              "Atölyeden doğrudan",
              "Özenli bitiş detayları",
            ],
            seoKeywords: ["el yapımı", "butik", "atölye", "hediyelik"],
          };
    const text = JSON.stringify(output);

    return {
      text,
      costUsd: 0,
      model: "mock/writer",
      raw: { mock: true, promptLength: input.prompt.length },
    };
  }
}
