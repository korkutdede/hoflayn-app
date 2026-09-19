import type { CreditPackId } from "./types";

export const PRO_PLAN = {
  id: "pro",
  name: "Profesyonel",
  monthlyCredits: 900,
  priceCents: 2499,
  currency: "USD",
  defaults: {
    modules: {
      studio: true,
      writer: true,
      catalog: true,
      barcode: true,
    },
    limits: {
      max_ai_jobs_per_day: 100,
      storage_gb: 20,
    },
  },
} as const;

export const CREDIT_PACKS: Record<
  CreditPackId,
  { id: CreditPackId; credits: number; label: string; priceCents: number }
> = {
  credits_50: {
    id: "credits_50",
    credits: 50,
    label: "50 kredi",
    priceCents: 499,
  },
  credits_200: {
    id: "credits_200",
    credits: 200,
    label: "200 kredi",
    priceCents: 1499,
  },
};

export function isCreditPackId(value: string): value is CreditPackId {
  return value === "credits_50" || value === "credits_200";
}

export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
