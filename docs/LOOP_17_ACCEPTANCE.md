# Loop 17 acceptance — Desi + Cost & Profit

## What shipped

- Shared package `@hoflayn/calc`: money (integer minor units), desi, profit
- Product fields: `length_cm`, `width_cm`, `height_cm`, `weight_kg` (+ existing `cost_price`)
- `tool_scenarios` table with RLS (`is_member_of`, FORCE RLS)
- Bearer API: list/create/update/delete scenarios + confirm-gated apply to product
- Mobile **Araçlar** tab: desi + profitability screens (no AI credits)
- Product form: maliyet + ölçü/ağırlık fields

## Formulas

### Desi
`desi = ceil((L × W × H / divisor) × 1000) / 1000`

Billable weight = `max(actualWeightKg, desi)`. Missing weight → billable = desi (listed in assumptions).

Carrier presets (Yurtiçi / Aras / MNG) default divisor `3000`; custom accepts any positive divisor.

### Profit
All money in integer minor units (kuruş). Unit cost = materials + labor + packaging + commission + shipping + other. Missing components count as `0` and appear in `assumptions`.

- Gross profit = sell − unit cost
- Margin % = gross / sell × 100
- Break-even = unit cost
- Target price = unit cost / (1 − targetMargin)

Sell price / target margin optional; related results stay null (no invented certainty).

## Migration

`drizzle/0006_special_tana_nile.sql` — product dimensions + `tool_scenarios` + RLS policies.

## Automated acceptance

```text
npm install
npm run db:migrate
npm test
npm run typecheck
npm run lint
npm run build
npm run mobile:typecheck
npm run mobile:lint
npm exec --workspace mobile -- expo export --platform web
```

Observed (2026-08-09): migrate OK · tests 12/12 · typecheck/lint/build/mobile typecheck/lint/export OK.

## Manual mobile acceptance

1. Araçlar → Desi: ölçü gir, taşıyıcı değiştir, sonucu kaydet.
2. Desi senaryosunu ürüne uygula — onay olmadan yazılmamalı; `applyDimensions` ile ölçü/ağırlık ürün kaydına düşmeli.
3. Araçlar → Kârlılık: kalemler + satiş/hedef marj; eksik kalemlerin varsayımlarda görünmesi.
4. Profit apply: yalnızca işaretlenen alanlar (`costPrice` / satış fiyatı) yazılmalı.
5. Demo modunda kayıt/apply yapılmamalı; hesap sonuçları lokal görünsün.

## Out of scope (by design)

Carrier live APIs, auto price fetch, AI credits for these tools.

## Loop 18 prompt (do not run until Loop 17 accepted)

```text
LOOP 18 — AI SEO Assistant

Mevcut product-ai service ve provider abstraction üzerine bağımsız SEO Yardımcısı kur.

1. Shared schema: seo audit, title, metaDescription, slug, primary/secondary keywords, warnings.
2. Kanal profilleri oluştur; ilk kanallar generic web ve Hoflayn Web olsun.
3. AI çıktısını Zod ile doğrula; uzunluk, tekrar ve slug kontrollerini deterministik yap.
4. analyze_seo kredi maliyetini COSTING.md ve cost caps'e ekle.
5. ai_jobs üzerinden çalıştır; sonuç pending confirmation olarak dönsün.
6. Kullanıcı seçili alanları onaylayarak ürüne uygulasın; geçmiş kaydı tut.
7. Mobil ürün detayına SEO bölümü ekle.
8. Tenant, entitlement, credit ve role testleri yaz.
9. Typecheck, lint, build, Expo export ve API smoke testini tamamla.

Kapsam dışı: canlı Google sıralama/veri çekme.
Bitince ölçülen kuralları ve LOOP 19 promptunu paylaş. Commit oluşturma.
```
