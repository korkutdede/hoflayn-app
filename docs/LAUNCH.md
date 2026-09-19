# Beta Launch Checklist

> **Readiness freeze:** [`BETA_READINESS.md`](BETA_READINESS.md)  
> Smoke GO + manuel kritik yollar yeşil olmadan davet gönderme / “beta açıldı” deme.

Closed beta: **10 producers**. Feature freeze + go/no-go below.

Public Play launch (open signup, AAB, legal URLs): [`PLAY.md`](PLAY.md).

## Beta scope (feature freeze)

### In scope

- **AI Fotoğraf Stüdyosu**: `remove_bg`, `white_bg`
- **Ürün yönetimi** + stok hareketleri + düşük stok uyarıları
- **AI ürün açıklaması** + **Instagram caption** + **SEO yardımı** (writer / Pro)
- **Katalog PDF** + **barkod/etiket** (Pro modules)
- **Satış**: manuel + CSV iskelet, void, summary, home pulse
- **Billing**: Pro + credit packs (Stripe)
- **Invite gate**: `ALLOWLIST_EMAILS` (+ opsiyonel `BETA_SIGNUPS_CLOSED` / `BETA_MAX_TENANTS`)
- **Hoflayn Web Bridge**: export stub (app → marketplace), inbound status webhook

### Out of scope (bilinçli — beta’da yok)

Lifestyle sahneleri, Hoflayn Web çift yön, takım UI, ayrı AI worker servisi, push,
tam muhasebe/POS, kısmi iade, referral kodları, public open signup, 3P analytics.

Tam tablo: [`BETA_READINESS.md`](BETA_READINESS.md).

## Go / No-Go

1. `npm run beta:smoke` → **GO** (required env + DB + health)  
2. `npm run beta:smoke -- --gates` → **GO** (önerilir açılış öncesi)  
3. `npm run preflight` — hâlâ geçerli; smoke bunu tamamlar  
4. Manuel kritik: [`BETA_SMOKE.md`](BETA_SMOKE.md) A1–A4, S1, P1–P2, V1, B1  
5. Özet checkbox: [`BETA_READINESS.md`](BETA_READINESS.md)

### 1. Database & schema
- [ ] `DATABASE_URL` points at the beta Supabase project
- [ ] `npm run db:migrate` applied (latest journal migrations)
- [ ] `npm run db:seed` ran (free + pro plans present)
- [ ] RLS policies active on tenant-scoped tables

### 2. Supabase
- [ ] Auth redirect URL includes `<APP_URL>/auth/callback`
- [ ] Mobile: `EXPO_PUBLIC_SUPABASE_*` + `EXPO_PUBLIC_API_URL` (LAN reachable)
- [ ] Google OAuth provider: same web client as hoflayn.com; Console origins +
      `https://<PROJECT_REF>.supabase.co/auth/v1/callback` added (keep PHP callback)
- [ ] Storage: `supabase/storage-policies.sql` executed (private `media-assets`
      bucket + tenant-prefix policies)

### 3. Stripe — test → live decision
- [ ] **Decide**: stay in test mode for beta, or cut over to live
  (full steps: [`docs/STRIPE_CUTOVER.md`](STRIPE_CUTOVER.md))
- [ ] If beta on test mode: producers use Stripe test cards (documented in invite);
      `/billing` shows amber test banner when applicable
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`,
      `STRIPE_CREDITS_*_PRICE_ID` all set (all-or-nothing — preflight/smoke)
- [ ] Optional `STRIPE_MODE=test|live` matches key prefix
- [ ] Webhook endpoint `<APP_URL>/api/billing/webhook` registered in Stripe
      (live `whsec_` ≠ test `whsec_`)
- [ ] `GET /api/health` → `ready: true`
- [ ] Full checkout → credit grant → balance update loop (once in current mode)
- [ ] If live: no leftover test `billing_customers` rows for smoke tenants

### 4. Health & observability
- [ ] `GET /api/health` returns `ready: true`
- [ ] Structured `logEvent` lines visible in Vercel logs
      (`auth.signup`, `ai_job.succeeded/failed`, `billing.webhook`, `bridge.export`,
      `funnel.sale_*`, `funnel.low_stock_detected`)

### 5. Cost controls (see `docs/COSTING.md`)
- [ ] `HOURLY_TENANT_USD_CAP` / `DAILY_TENANT_USD_CAP` set to sane beta values
- [ ] `STUDIO_JOBS_PER_MINUTE` set (default 10) — soft per-tenant rate limit
- [ ] Credit costs reviewed (`CREDIT_COSTS` + Hesap “Nereye harcandı?”)

### 6. Support & invite
- [ ] `SUPPORT_EMAIL` set — dashboard / auth / invite errors
- [ ] Someone is watching that inbox during beta
- [ ] `ALLOWLIST_EMAILS` set with 10 producer emails ([`BETA_INVITE.md`](BETA_INVITE.md))
- [ ] Davet e-postası **yalnızca** readiness freeze GO sonrası gönderilir
- [ ] Gate boş bırakılırsa herkese açık olur → kapalı beta sayılmaz

### 7. Bridge (optional for beta)
- [ ] If enabled: `HOFLAYN_WEB_BRIDGE_URL` + `HOFLAYN_WEB_BRIDGE_API_KEY` set and PHP
      endpoint live (see `docs/BRIDGE.md`)
- [ ] If disabled: export button surfaces a clear "not configured" error — OK for beta

## Rollback

- Feature flags are per-plan entitlements; disable a module via `tenant_entitlements`.
- Stripe: pause new subscriptions in dashboard; existing credits unaffected.
- Full stop: take down Vercel deployment; DB + Storage persist.
- Signups: `BETA_SIGNUPS_CLOSED=true` or clear new allowlist adds.
