# Loop 22 acceptance — Sales Data Model

## Sale sources

| Source | Status | Notes |
|--------|--------|-------|
| `manual` | shipped | Mobile form + `POST /api/v1/sales` |
| `csv` | adapter skeleton | `parseSalesCsv` + `POST /api/v1/sales/import` (SKU resolve → one sale) |
| `hoflayn_web` | reserved enum | Blocked in `createSale`; separate adapter later |

## Stock linkage

- Completed sale writes `stock_movements` with `type=out`, `related_type=sale`, `related_id=<sale.id>` in the **same transaction** as `sales` + `sale_lines`.
- Each line stores `stock_movement_id`.
- Draft hold: `reserveStockForSaleDraft` → `related_type=sale_draft` (reserve hook from Loop 21).

Money is integer **minor units** (`total_minor`, `unit_price_minor`, `line_total_minor`).

## What shipped

- Schema + RLS: `sales`, `sale_lines` (`drizzle/0011_tearful_chimera.sql`)
- Service: `src/lib/services/sales.ts` (atomic create, list, get, CSV import)
- Stock helper: `applyStockMovementOn` for nested-tx-safe ledger writes
- API: `GET/POST /api/v1/sales`, `GET /api/v1/sales/[id]`, `POST /api/v1/sales/import`
- Mobile: Araçlar → Satışlar list + yeni satış formu
- Tests: `tests/sales.test.ts` (schema, CSV, minor units, role/idempotency contracts)

## Roles

- List/get: any tenant member
- Create / CSV import: `owner` / `admin` only
- `allowNegativeStock`: managers only (same stock policy)

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

1. Araçlar → Satışlar → Yeni satış.
2. Ürün seç, adet + birim fiyat → kaydet.
3. Liste tutarı ve satırı gösterir; ürün stoğu düşer.
4. Yetersiz stok → hata (409).
5. Member rolü ile create → 403.

## Out of scope

Full accounting, POS hardware, automatic Hoflayn Web sales pull.

## Loop 23 prompt (do not run until Loop 22 accepted)

```text
LOOP 23 — Sales Analytics Lite

Hoflayn'a basit satış analitiği ekle.

1. Tenant bazlı özet: bugün / 7 gün / 30 gün ciro (minor), adet, satış sayısı.
2. Ürün bazlı top-N satış (adet + ciro); stok hareketi ile tutarlı olsun.
3. GET /api/v1/sales/summary (+ opsiyonel productId filtresi).
4. Mobil Araçlar veya Satışlar ekranında özet kartı (grafik zorunlu değil).
5. Tenant izolasyonu testleri yaz.
6. Typecheck, lint, build, Expo export tamamla.

Kapsam dışı: muhasebe, vergi, tam BI dashboard, Hoflayn Web otomatik sync.
Bitince metrikleri ve LOOP 24 promptunu paylaş. Commit oluşturma.
```
