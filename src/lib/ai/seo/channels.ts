import { z } from "zod";

export const seoChannelIdSchema = z.enum(["generic_web", "hoflayn_web"]);
export type SeoChannelId = z.infer<typeof seoChannelIdSchema>;

export type SeoChannelProfile = {
  id: SeoChannelId;
  label: string;
  titleMin: number;
  titleMax: number;
  metaMin: number;
  metaMax: number;
  slugMax: number;
  secondaryMax: number;
  notes: string;
};

export const SEO_CHANNEL_PROFILES: Record<SeoChannelId, SeoChannelProfile> = {
  generic_web: {
    id: "generic_web",
    label: "Genel web",
    titleMin: 20,
    titleMax: 60,
    metaMin: 70,
    metaMax: 160,
    slugMax: 80,
    secondaryMax: 8,
    notes: "Klasik arama snippet limitleri (title ~60, meta ~160).",
  },
  hoflayn_web: {
    id: "hoflayn_web",
    label: "Hoflayn Web",
    titleMin: 15,
    titleMax: 80,
    metaMin: 40,
    metaMax: 200,
    slugMax: 100,
    secondaryMax: 6,
    notes: "Pazar yeri ürün kartı için biraz daha esnek başlık/meta.",
  },
};

export function getSeoChannelProfile(channel: SeoChannelId): SeoChannelProfile {
  return SEO_CHANNEL_PROFILES[channel];
}
