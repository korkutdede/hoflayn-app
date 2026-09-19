# Loop 20 acceptance — Barcode & Label

## Label sizes (mm)

| Id | Size | Notes |
|----|------|-------|
| `50x30` | 50×30 | Compact shelf / jewelry |
| `62x29` | 62×29 | Brother DK-style continuous |
| `100x50` | 100×50 | Larger name + price |

Copies: 1–50 per product. Options: show name, show price.

## Symbology / GS1 vs internal SKU

| Format | Payload | Use |
|--------|---------|-----|
| `code128` | Free-form SKU / barcode value | Internal workshop codes |
| `qr` | Free-form text | Shareable SKU / short URL |
| `gs1_128` | Digits only (8–48) | GS1 AI stream (e.g. GTIN); **no auto check-digit** |

Product fields: `sku`, `barcode_value` (fallback to sku), `barcode_format`.

## What shipped

- Schema + RLS: product SKU fields, `label_exports`, `label_export_items`
- Durable job `generate_labels` (bwip-js + pdfkit) → Storage export TTL 14d
- Pro `barcode: true` (re-seed); Free false; `DEV_UNLOCK_BARCODE` / dev bypass
- API: `GET/POST /api/v1/labels`, `GET /api/v1/labels/:id`
- Mobile: Araçlar → Etiket sihirbazı; product form SKU fields
- Credit: **1** (`docs/COSTING.md`)

## Migration

`drizzle/0009_wide_the_watchers.sql` + `npm run db:seed`

## Automated acceptance

```text
npm run db:migrate
npm run db:seed
npm test
npm run typecheck
npm run lint
npm run build
npm run mobile:typecheck
npm run mobile:lint
npm exec --workspace mobile -- expo export --platform web
```

## Manual mobile acceptance

1. Product form: set SKU (and optional barcode value).
2. Araçlar → Etiket: pick products, size, format, copies → PDF.
3. Preview/share works; GS1 with letters fails clearly.
4. Member cannot create; idempotent key reuses export.

## Out of scope

Printer drivers, live scanner apps.

## Loop 21 prompt (do not run until Loop 20 accepted)

```text
LOOP 21 — Stock Movement Ledger

Hoflayn'a stok hareket defteri ekle.

1. stock_movements şemasını (in/out/adjust/reserve) + RLS tasarla; products.stock_quantity ile tutarlı tut.
2. Atomik stok güncellemesi: hareket kaydı ve bakiye aynı transaction'da.
3. Mobil ürün detayında stok gir/çık/sayım ve hareket geçmişi göster.
4. Negatif stok politikasını netleştir (varsayılan: engelle; yönetici override opsiyonel).
5. Katalog/etiket/satış için rezervasyon kancasını hazırla; henüz satış modülüne bağlama.
6. Tenant izolasyonu ve role testleri yaz.
7. Typecheck, lint, build, Expo export tamamla.

Kapsam dışı: tam WMS, çoklu depo, satınalma siparişi.
Bitince hareket tiplerini ve LOOP 22 promptunu paylaş. Commit oluşturma.
```
