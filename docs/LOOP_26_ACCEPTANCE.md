# Loop 26 acceptance — Workshop Home Pulse

## Pulse fields

| Field | Source |
|-------|--------|
| `creditBalance` | `tenants.credit_balance` |
| `todaySales` | `sales/summary` → `windows.today` (completed only, UTC) |
| `lowStockCount` | `products/low-stock` → `count` |
| `recentSales` | last 5 sales (any status), trimmed DTO |
| `empty.*` | UI flags for no sales today / no recent / no low stock |

Members may read. All underlying queries are tenant-scoped.

## What shipped

- Pure builder: `src/lib/home/pulse.ts`
- Service: `getHomePulse`
- API: `GET /api/v1/home/pulse`
- Mobile Ana Sayfa: nabız kartları + Satışlar / Ürünler deep link
- Demo: `DEMO_HOME_PULSE`
- Tests: `tests/home-pulse.test.ts`

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

1. Ana Sayfa → bugünkü satış / düşük stok / son satışlar / kredi.
2. Satışlara git → satış listesi; Ürünlere git → ürünler.
3. Demo modda örnek nabız + demo bandı.
4. Boş atölyede empty metinleri görünür.

## Out of scope

Push, widgets, BI charts, marketplace sync.

## Loop 27 prompt (do not run until Loop 26 accepted)

Accepted → see `docs/LOOP_27_ACCEPTANCE.md`.
