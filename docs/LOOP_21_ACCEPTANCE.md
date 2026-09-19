# Loop 21 acceptance — Stock Movement Ledger

## Movement types

| Type | Input `quantity` | Ledger delta | Effect |
|------|------------------|--------------|--------|
| `in` | positive units | `+qty` | Goods received |
| `out` | positive units | `−qty` | Sale / waste / ship |
| `adjust` | absolute on-hand | `target − current` | Cycle count / sayım |
| `reserve` | positive units | `−qty` | Hold for catalog/label/sale (hook) |

`products.stock_quantity` updates in the **same transaction** as the ledger row (`FOR UPDATE`).

## Negative stock policy

- Default: **block** (`409 insufficient_stock`) when balance would go below 0.
- Managers (`owner`/`admin`) may pass `allowNegative: true`.
- Members cannot enable override.

## Reservation hook

`reserveStockForRelated` / `releaseStockReservation` in `src/lib/services/stock-movements.ts` with idempotency keys. Not wired to catalog/label/sales yet.

## What shipped

- Schema + RLS: `stock_movements`
- API: `GET/POST /api/v1/products/[id]/stock-movements`
- Mobile product detail: stok panel (giriş/çıkış/sayım/rezerv + geçmiş)
- Existing product form stock field is display-only when editing; create still sets opening stock

## Migration

`drizzle/0010_black_eternity.sql`

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

1. Open product → Stok hareketleri → Giriş 5 → balance 5.
2. Çıkış 2 → balance 3; history shows deltas.
3. Çıkış larger than stock without override → error.
4. Manager: allow negative → succeeds.
5. Sayım to absolute 10 → balance 10.

## Out of scope

Multi-warehouse WMS, purchase orders.

## Loop 22 prompt (do not run until Loop 21 accepted)

```text
LOOP 22 — Sales Data Model

Hoflayn'a satış veri modelini ekle.

1. sales / sale_lines şemalarını + RLS tasarla; stok çıkışı stock_movements.reserve/out ile bağlanabilir olsun.
2. Manuel satış girişi ve CSV import adapter iskeleti (Hoflayn Web import ayrı kalır).
3. Satış kaydı atomik: satırlar + stok hareketi (veya açık rezervasyon çözümü) aynı transaction'da.
4. Mobil satış listesi ve basit satış ekleme formu.
5. Tenant izolasyonu, role ve idempotency testleri yaz.
6. Typecheck, lint, build, Expo export tamamla.

Kapsam dışı: tam muhasebe, POS donanımı, otomatik Hoflayn Web satış çekme.
Bitince satış kaynaklarını ve LOOP 23 promptunu paylaş. Commit oluşturma.
```
