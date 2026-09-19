# Loop 25 acceptance — Sale Void & Stock Restore

## Void rules

| Rule | Behavior |
|------|----------|
| Transition | `completed` → `voided` only |
| Stock | Each line: `stock_movements.in`, `related_type=sale_void`, `related_id=sale.id` in **same transaction** |
| Second void | Idempotent **no-op** (`reused: true`, 200) |
| Other status | `409 sale_void_conflict` |
| Role | `owner` / `admin` only (`member` → 403) |
| Summary | Only `completed` counted (voided drops out) |
| Low stock | Re-evaluated after void; returned as `lowStockAlerts` |

Idempotency for stock rows: `sale-void:{saleId}:{lineId}[:requestKey]`.

## What shipped

- `voidSale` in `src/lib/services/sales.ts`
- Decision helpers: `src/lib/sales/void.ts`
- API: `POST /api/v1/sales/[id]/void`
- Mobile: Satışlar → onaylı “Satışı iptal et”
- Tests: `tests/sale-void.test.ts`

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

1. Satış oluştur → stok düşer.
2. Satışlar → Satışı iptal et → onay → status voided, stok iade.
3. Özet cirosu düşer; düşük stok bandı güncellenir.
4. Aynı satışı tekrar iptal → hata yok (no-op).

## Out of scope

Partial refund, accounting, marketplace sync, POS.

## Loop 26 prompt (do not run until Loop 25 accepted)

Accepted → see `docs/LOOP_26_ACCEPTANCE.md`.
