# Loop 18 acceptance — AI SEO Assistant

## What shipped

- Shared SEO schema: suggestion + deterministic audit (score, warnings, checks)
- Channel profiles: `generic_web`, `hoflayn_web` (title/meta/slug/keyword limits)
- `analyze_seo` AI job (writer module, 2 credits, `pendingConfirmation`)
- Product SEO columns + `product_seo_history` (RLS) for applied versions
- API: `GET/POST/PATCH /api/v1/products/[id]/seo`
- Mobile product form: SEO bölümü (kanal seç, üret, alan seç, uygula)

## Measured rules (deterministic)

| Check | Rule |
|-------|------|
| Title length | Channel min–max (web 20–60, Hoflayn Web 15–80) |
| Meta length | Channel min–max (web 70–160, Hoflayn Web 40–200) |
| Slug | ASCII lowercase + hyphens only; max by channel |
| Primary in title/meta | Case-insensitive Turkish locale includes |
| Keyword repetition | Primary + secondary unique |
| Secondary count | ≤ channel max (web 8, Hoflayn Web 6) |
| Score | Starts 100; deductions for missing/failed checks |

AI output is Zod-parsed; slug is normalized before audit. Apply never runs without at least one selected field; members cannot apply (403).

## Costing

| Op | Est. USD | Credits | Margin @ Pro |
|----|---------:|--------:|-------------:|
| `analyze_seo` | $0.0020 | 2 | ~96% |

See `docs/COSTING.md`. Caps unchanged (provider USD hourly/daily).

## Migration

`drizzle/0007_wandering_naoko.sql` — product SEO fields, `product_seo_history`, RLS.

## Automated acceptance

```text
npm run db:migrate
npm test
npm run typecheck
npm run lint
npm run build
npm run mobile:typecheck
npm run mobile:lint
npm exec --workspace mobile -- expo export --platform web
```

## Manual mobile acceptance

1. Open a product → SEO Yardımcısı → Genel web / Hoflayn Web.
2. Generate; confirm job polls and shows score + warnings without writing product.
3. Toggle fields → apply; confirm only selected SEO columns update; history via GET.
4. As member: apply returns forbidden.
5. Free plan without writer: analyze blocked (unless DEV unlock).

## Out of scope

Live Google ranking / SERP fetch.

## Loop 19 prompt (do not run until Loop 18 accepted)

```text
LOOP 19 — PDF Catalog Builder

Hoflayn'a tenant-safe PDF Katalog Oluşturucu ekle.

1. catalogs, catalog_items, catalog_exports şemalarını, indexleri ve RLS'i tasarla.
2. İlk sürümde yalnızca 2 kaliteli sabit şablon kullan; serbest tasarım editörü yapma.
3. Ürün seçimi/sıralama, kapak, atölye bilgisi, fiyat görünürlüğü ve tema seçeneklerini destekle.
4. PDF üretimini web request içinde yapma; LOOP 16 durable worker üzerinden çalıştır.
5. Dosyayı tenant-prefixed Storage'a koy; signed URL ve retention politikası uygula.
6. Expo'da katalog sihirbazı, durum polling, önizleme ve native share ekle.
7. Eksik görsel ve uzun metinler için layout bozulmasını engelle.
8. Idempotent yeniden üretim ve tenant izolasyon testlerini yaz.
9. Typecheck, lint, build, Expo export ve smoke testi tamamla.

Kapsam dışı: serbest sayfa editörü ve canlı baskı entegrasyonu.
Bitince şablon kararlarını ve LOOP 20 promptunu paylaş. Commit oluşturma.
```
