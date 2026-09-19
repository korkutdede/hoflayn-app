# Loop 19 acceptance — PDF Catalog Builder

## Template decisions

| Id | Layout | Use |
|----|--------|-----|
| `grid` | Cover + 2-column product cards | Dense wholesale / multi-SKU lists |
| `lookbook` | Cover + one product per page (large image) | Boutique storytelling |

Themes: `linen` (warm paper) · `ink` (cool slate). No free-form editor.

Layout guards: long text truncated; missing covers use “Görsel yok” placeholder; invalid image buffers fall back to placeholder.

## What shipped

- Schema: `catalogs`, `catalog_items`, `catalog_exports` + RLS
- Durable job `generate_catalog` via `ai_jobs` / Loop 16 worker
- Storage: `{tenantId}/exports/*.pdf`, `media_kind=export`, TTL 14 days
- Pro plan: `catalog: true` (re-seed plans); Free stays false; `DEV_UNLOCK_CATALOG` / development bypass
- API: `GET/POST /api/v1/catalogs`, `GET .../:id`, `POST .../:id/exports`, `GET .../exports/:exportId`
- Idempotent export by `(tenant_id, idempotency_key)`
- Mobile: Araçlar → Kataloglar + sihirbaz (poll, preview, share)
- Credit: **1** (`docs/COSTING.md`)

## Migration

`drizzle/0008_good_firedrake.sql`

Also run `npm run db:seed` so Pro plan defaults enable `catalog`.

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

1. Araçlar → Kataloglar → Yeni katalog.
2. Select products, template, theme, price/workshop toggles → produce PDF.
3. Confirm job polls; PDF opens / shares.
4. Same idempotency key returns existing export without double charge path reuse.
5. Member role cannot create/export.

## Out of scope

Free-form page editor, live print integrations.

## Loop 20 prompt (do not run until Loop 19 accepted)

```text
LOOP 20 — Barcode & Label

Hoflayn'a barkod/etiket üretimini ekle.

1. Ürün için SKU / barcode value alanlarını ve etiket şablonlarını modelle.
2. Code128 ve QR üret; GS1 ile iç SKU ayrımını dokümante et.
3. Tekli ve toplu etiket PDF'ini durable worker ile üret; Storage'a kaydet.
4. Mobilde etiket sihirbazı: boyut, adet, fiyat gösterimi, önizleme ve paylaşım.
5. Tenant izolasyonu, entitlement (barcode modülü) ve kredi/costing güncelle.
6. Unit testlerde encode doğruluğu ve layout taşmasını kapsa.
7. Typecheck, lint, build, Expo export tamamla.

Kapsam dışı: fiziksel yazıcı sürücüsü ve canlı tarayıcı entegrasyonu.
Bitince etiket boyutlarını ve LOOP 21 promptunu paylaş. Commit oluşturma.
```
