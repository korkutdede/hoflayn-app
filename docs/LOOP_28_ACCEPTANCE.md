# Loop 28 acceptance — Usage & Cost Transparency (Mobile)

## Usage fields (`GET /api/v1/usage`)

| Field | Meaning |
|-------|---------|
| `windowDays` | Default **7** |
| `creditsUsed` | Sum of abs(usage) credit ledger rows |
| `jobCount` / `succeededJobs` | AI jobs in window |
| `byOperation[]` | From `ai_jobs` where `credits_charged > 0`, grouped by `operation` |
| `byOperation.label` | TR label from `CREDIT_OPERATION_LABELS_TR` |
| `byOperation.unitCost` | `CREDIT_COSTS[operation]` or null |

Provider USD (`estimatedUsd`) stays server-internal — not exposed on this endpoint.

## What shipped

- Labels: `src/lib/credits/labels.ts`
- Summary breakdown in `getTenantCostSummary`
- Mobile Hesap: “Nereye harcandı?” list
- Mobile Ana Sayfa: 7g kredi satırı + Hesap deep link
- Tests: `tests/usage-breakdown.test.ts`

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

1. AI işi çalıştır → Hesap → Nereye harcandı? satırı güncellenir.
2. Ana Sayfa kredi kartında “Son 7 gün: −N · en çok …” görünür.
3. Demo modda örnek kırılım görünür.

## Out of scope

Provider $ UI, invoice PDF, new billing provider.

## Loop 29 prompt (do not run until Loop 28 accepted)

Accepted → see `docs/LOOP_29_ACCEPTANCE.md`.
