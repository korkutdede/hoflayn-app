# Loop 24 acceptance — Low Stock Alerts Lite

## Threshold rules

| Level | Field | Default |
|-------|-------|---------|
| Tenant | `tenants.default_low_stock_threshold` | **5** |
| Product override | `products.low_stock_threshold` | `null` → use tenant default |

Alert when `stock_quantity ≤ effective_threshold` (inclusive).

## Sync evaluation

After `applyStockMovement` and `createSale`, `evaluateLowStockForProducts` runs and returns `lowStockAlerts` on the API result. Listing: `GET /api/v1/products/low-stock`.

Tenant default update: `PATCH /api/v1/products/low-stock` `{ defaultLowStockThreshold }` (manager).

## What shipped

- Migration `drizzle/0012_melted_sue_storm.sql` (tenant + product columns; covered by existing RLS)
- Policy: `src/lib/stock/low-stock.ts`
- Service: `src/lib/services/low-stock.ts`
- Product input: optional `lowStockThreshold`
- Mobile: Ürünler + Satışlar uyarı bandı; ürün formunda eşik alanı
- Tests: `tests/low-stock.test.ts`

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

1. Ürünü stok 3, eşik boş (varsayılan 5) → Ürünler’de düşük stok bandı.
2. Stok girişiyle 10’a çıkar → listeden düşer.
3. Satış sonrası tekrar eşik altına inerse Satışlar bandında görünür.
4. Ürün formu eşiğini 0 yap → yalnızca stok 0 uyarı verir.

## Out of scope

Push/email, auto PO, multi-warehouse.

## Loop 25 prompt (do not run until Loop 24 accepted)

Accepted → see `docs/LOOP_25_ACCEPTANCE.md`.
