# Hoflayn.app

AI-powered work desk for handmade & boutique producers (ceramics, candles, wood,
epoxy, textile, …). Independent SaaS; marketplace integration is a thin bridge
only — never a PHP migration.

- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- v1 roadmap: [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Beta retro template: [`docs/RETRO.md`](docs/RETRO.md)
- Bridge contract: [`docs/BRIDGE.md`](docs/BRIDGE.md)
- Marketplace identity (no shared DB): [`docs/ADR-016-marketplace-identity.md`](docs/ADR-016-marketplace-identity.md)
- Play Store checklist: [`docs/PLAY.md`](docs/PLAY.md)
- Beta test plan: [`docs/BETA.md`](docs/BETA.md)
- Beta invite: [`docs/BETA_INVITE.md`](docs/BETA_INVITE.md)
- Beta smoke checklist: [`docs/BETA_SMOKE.md`](docs/BETA_SMOKE.md)
- Beta readiness freeze: [`docs/BETA_READINESS.md`](docs/BETA_READINESS.md)
- Beta analytics: [`docs/ANALYTICS.md`](docs/ANALYTICS.md)
- AI costing: [`docs/COSTING.md`](docs/COSTING.md)
- Launch checklist: [`docs/LAUNCH.md`](docs/LAUNCH.md)
- Stripe live cutover: [`docs/STRIPE_CUTOVER.md`](docs/STRIPE_CUTOVER.md)

## Beta scope (feature freeze)

Closed beta (10 producers) ships exactly this — nothing else until stable:

- **AI Fotoğraf Stüdyosu**: `remove_bg`, `white_bg`
- **Ürün yönetimi** + Pro writer: AI ürün açıklaması ve Instagram caption
- **Billing**: Pro plan + credit packs (Stripe)
- **Hoflayn Web Bridge**: idempotent product upsert/archive, signed media transfer,
  moderation status webhook, and retryable UI actions

Out of scope: catalog/barcode, team seats, live-worker queue.

## Beta learning

Beta is measured from our own data — no third-party analytics. Structured
`funnel.*` log lines answer "what just happened"; `npm run beta:funnel` answers
"where did the cohort get stuck". Activation = signup → first studio job;
north star = a caption generated (all three modules working together).
Details and event table: [`docs/ANALYTICS.md`](docs/ANALYTICS.md).

When beta closes, fill [`docs/RETRO.md`](docs/RETRO.md) from the funnel output and
producer notes; its decisions feed [`docs/ROADMAP.md`](docs/ROADMAP.md). Scope
requires evidence — a feature enters v1 only with a funnel number, 3+ producer
requests, or a measured technical signal.

## Stack

- Expo Router / React Native (Android + iOS + web producer UI)
- Next.js 16 (versioned API, jobs, webhooks and optional ops UI)
- Supabase (Auth, Postgres + RLS, Storage)
- Drizzle ORM · Stripe (billing) · Vercel

## Local setup

### 1. Env

```powershell
Copy-Item .env.example .env.local
```

Minimum for auth + DB + studio uploads:

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only |
| `DATABASE_URL` | Session pooler (5432) for migrate/seed; Transaction (6543) for app |

Optional: `STRIPE_*`, `REPLICATE_API_TOKEN`, `OPENAI_API_KEY`, `HOFLAYN_WEB_BRIDGE_*`.

### 2. Install & migrate

```bash
npm install
npm run db:migrate
npm run db:seed
```

### 3. Supabase Auth & Storage

1. Auth → URL config redirects:
   `http://localhost:3000/auth/callback`,
   `https://hoflayn.app/auth/callback`,
   `hoflayn://auth/callback`
2. Auth → Providers → Google: same web Client ID + Secret as hoflayn.com.
   Google Cloud Console must also allow `https://hoflayn.app` (JS origin) and
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback` (keep the existing
   `https://hoflayn.com/functions/core/auth/endpoints/google-callback.php`).
   Google login creates a Supabase user only — no PHP `users` row.
3. SQL Editor: run [`supabase/storage-policies.sql`](supabase/storage-policies.sql)
   (creates private `media-assets` bucket + tenant-prefix policies)

### 4. Dev server

```bash
npm run dev:lan
npm run mobile:start
```

The physical phone and computer must share a network. Set
`mobile/.env` → `EXPO_PUBLIC_API_URL` to the computer's LAN address, not
`localhost`, then scan the Expo Go QR. Expo web is available with
`npm run mobile:web`.

Next web: http://localhost:3000 · health: http://localhost:3000/api/health

### 5. Stripe webhooks (local)

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Copy the printed `whsec_…` into `.env.local` as `STRIPE_WEBHOOK_SECRET`.
Create test Prices for Pro + credit packs and set `STRIPE_*_PRICE_ID`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run dev:lan` | Next.js API reachable from a phone on the LAN |
| `npm run build` | Production build |
| `npm run mobile:start` | Expo Go / universal development server |
| `npm run mobile:tunnel` | Expo Go tunnel when LAN discovery is unavailable |
| `npm run mobile:web` | Expo web client |
| `npm run mobile:typecheck` | Expo TypeScript check |
| `npm run mobile:lint` | Expo lint |
| `npm run db:generate` | Drizzle migration from schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Idempotent free + pro plan seed |
| `npm run db:studio` | Drizzle Studio |
| `npm run preflight` | Beta go/no-go: required env + DB connectivity |
| `npm run beta:smoke` | Closed-beta smoke: env/health + checklist (`--gates`, `--dry-run`) |
| `npm run beta:funnel` | Beta funnel report (`-- 30` days, `-- 30 --json` for RETRO) |
| `npm run storage:gc` | Orphan media GC (dry-run; `--apply` deletes) |

## Layout

```
mobile/          Expo Universal producer client (Android/iOS/web)
packages/        Runtime-neutral contracts shared by clients
src/app/api/v1   Versioned producer API for Expo
src/app          Next.js API, webhooks and legacy/ops web UI
src/db/schema    One file per domain
src/lib          Shared services (auth, ai, credits, billing, bridge)
supabase/        Storage SQL (run in dashboard)
docs/            Architecture, bridge, beta
```

Posture: **modular monolith, extract-on-signal** (ADR-008).
