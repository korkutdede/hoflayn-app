# Loop 23 acceptance — Sales Analytics Lite

## Metrics

| Metric | Definition |
|--------|------------|
| `revenueMinor` | Integer kuruş. Unfiltered: sum of `sales.total_minor`. Product filter: sum of matching `sale_lines.line_total_minor`. |
| `quantitySold` | Sum of `sale_lines.quantity` in window |
| `saleCount` | Distinct completed sales with ≥1 matching line in window |
| Windows | UTC calendar: **today**, **last 7 days** (today−6 … today), **last 30 days** (today−29 … today) |
| `topProducts` | Last 30 days, ranked by quantity then revenue; default `topN=5` |

Only `status=completed` sales. Lines come from the same atomic sale write that creates `stock_movements.out` (`related_type=sale`).

## What shipped

- Pure aggregator: `src/lib/sales/summary.ts`
- Service: `getSalesSummary` (tenant-scoped, optional `productId`)
- API: `GET /api/v1/sales/summary?productId=&topN=`
- Mobile: Satışlar ekranında özet kartı + top products
- Tests: `tests/sales-summary.test.ts`

## Automated acceptance

```text
npm test
npm run typecheck
npm run lint
npm run build
npm run mobile:typecheck
npm run mobile:lint
npm exec --workspace mobile -- expo export --platform web
```

## Manual mobile acceptance

1. Araçlar → Satışlar → Özet kartı (bugün / 7g / 30g).
2. Bir satış ekle → bugün ciro ve adet artar.
3. Çok satanlar listesi 30 günlük ürünleri gösterir.

## Out of scope

Accounting, tax, full BI charts, Hoflayn Web auto sync.

## Loop 24 prompt (do not run until Loop 23 accepted)

Accepted → see `docs/LOOP_24_ACCEPTANCE.md`.
