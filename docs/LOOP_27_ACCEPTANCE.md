# Loop 27 acceptance — Credit Pack Purchase UX (Mobile)

## Checkout steps

1. `GET /api/v1/billing` → `creditBalance` + `creditPacks` (`credits_50`, `credits_200`).
2. Manager taps **Satın al** → `POST /api/v1/billing` `{ kind: "credit_pack", packId }`.
3. API returns Stripe Checkout `url` (mobile success/cancel → `/api/v1/billing/return` → `hoflayn://account?billing=`).
4. App opens URL via `Linking.openURL`.
5. Return deep link: banner + `refreshMe` / billing reload (short poll for webhook lag).
6. Webhook `checkout.session.completed` grants credits (`grantCredits`).

| Role | Credit pack |
|------|-------------|
| owner / admin | Satın al enabled when Stripe configured |
| member | Packs visible; purchase blocked with manager message (API 403) |

Subscription/portal may still require `EXPO_PUBLIC_ENABLE_EXTERNAL_BILLING` on native; **credit packs use browser Checkout** when configured.

## What shipped

- Policy helpers: `src/lib/billing/packs.ts`
- Mobile Hesap: bakiye hero, dedicated paket kartları, return refresh
- Tests: `tests/billing-packs.test.ts`
- Existing API unchanged (already tenant-scoped + member 403)

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

1. Hesap → bakiye + 50/200 paketleri.
2. Manager: Satın al → Stripe Checkout (test mode).
3. Success return → banner + bakiye yenileme denemesi.
4. Cancel return → iptal mesajı.
5. Member: Satın al → yönetici mesajı.

## Out of scope

New PSP, subscription redesign, accounting.

## Loop 28 prompt (do not run until Loop 27 accepted)

Accepted → see `docs/LOOP_28_ACCEPTANCE.md`.
