# Stripe Live Cutover (Stage 10)

Goal: move beta billing from **test** → **live** without half-configured env,
accidental local live charges, or webhook gaps.

## Prerequisites

- Stage 4 billing code deployed and working in **test** mode
- `npm run preflight` passes with test keys
- End-to-end test loop verified: Pro checkout → webhook → entitlements +
  monthly credits; credit pack → webhook → balance

## Mode rules (code-enforced)

| Signal | Behavior |
|--------|----------|
| `STRIPE_SECRET_KEY` starts with `sk_test_` | Mode = **test** |
| `STRIPE_SECRET_KEY` starts with `sk_live_` | Mode = **live** |
| Optional `STRIPE_MODE=test\|live` | Must match key prefix or preflight/health fail |
| Live key + localhost / `NODE_ENV=development` | Blocked unless `ALLOW_STRIPE_LIVE=true` |

`/billing` shows an amber banner in test mode. `/api/health` exposes
`checks.stripeMode` and `checks.stripeSafe` (never the key).

## Cutover steps

### 1. Stripe Dashboard (Live mode toggle ON)

1. Create **live** Products / Prices matching Pro + credit packs (same amounts
   as test).
2. Copy live Price IDs → `STRIPE_PRO_PRICE_ID`, `STRIPE_CREDITS_50_PRICE_ID`,
   `STRIPE_CREDITS_200_PRICE_ID`.
3. Copy live Secret key → `STRIPE_SECRET_KEY` (`sk_live_…`).
4. Developers → Webhooks → Add endpoint:
   `https://<production-host>/api/billing/webhook`
5. Subscribe at least:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid` (monthly Pro credits; period-key idempotent)
6. Copy the endpoint **Signing secret** → `STRIPE_WEBHOOK_SECRET` (`whsec_…`).
   Do **not** reuse the test `whsec_`.

### 2. Vercel / production env

Set together (atomic deploy preferred):

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_CREDITS_50_PRICE_ID=price_...
STRIPE_CREDITS_200_PRICE_ID=price_...
STRIPE_MODE=live
NEXT_PUBLIC_APP_URL=https://<production-host>
```

Unset `ALLOW_STRIPE_LIVE` in production (not needed there). Redeploy.

### 3. Verify

```bash
npm run preflight
# expect: mode=live, Result: GO
```

```bash
curl -s https://<production-host>/api/health | jq .checks
# expect: stripeMode=live, stripeSafe=true, database=ok
```

Manual smoke (real card, small amount — cancel Pro after if desired):

1. Sign in as a beta producer → `/billing` (no amber test banner)
2. Buy Pro → success redirect → wait for webhook (`billing.webhook` in logs)
3. Confirm entitlements plan = `pro`, credits granted
4. Buy a credit pack → balance increases once (replay webhook → `duplicate: true`)
5. Open Customer Portal → cancel / manage works

### 4. Customer mapping note

`billing_customers.customerId` from **test** customers must not be reused with
live keys. For a tenant that only ever paid in test:

- Delete that tenant’s `billing_customers` row (and optionally `subscriptions`)
  before their first live checkout, **or**
- Use a fresh tenant for live smoke.

Mixed test/live customer IDs cause Stripe 404 / “no such customer”.

## Rollback

1. Swap env back to `sk_test_` + test price IDs + test webhook secret
2. Set `STRIPE_MODE=test`
3. Redeploy
4. Pause live webhook endpoint in Stripe Dashboard (optional)

Existing live subscriptions remain in Stripe; pause or cancel there if needed.
App entitlements stay until you manually adjust `tenant_entitlements` /
`subscriptions`.

## Do not

- Mix test secret + live prices (or vice versa)
- Point the live webhook at localhost
- Commit live keys to git
- Run live keys on local without `ALLOW_STRIPE_LIVE=true`
