# Hoflayn.app — Architecture (v1.1)

Status: living document · Target: 100k active producers · Posture: **modular
monolith, extract-on-signal**

This is the *implementation posture* derived from the v1.0 vision. The vision
describes where we can go; this document governs what we build now and the rules
we do not break.

## Principles

| # | Principle | Meaning (as applied) |
|---|-----------|----------------------|
| P1 | Module boundaries | Each module owns its domain, UI and package boundary and never imports another module's internals. **Deploy unit is the monolith app**; services are extracted only on a measured signal (ADR-008). |
| P3 | Tenant isolation | Every tenant's data is isolated via Postgres RLS **and** an application-layer check. RLS is never disabled. |
| P4 | AI abstraction | No module calls a provider SDK directly. All AI runs through the AI layer as an `ai_jobs` record (queue + retry + circuit breaker). |
| P5 | Cost visibility | AI calls, storage and external APIs are cost-tracked per tenant with hard limits. (Not every DB query — that is noise.) |
| P6 | Bridge over migration | The PHP marketplace is never migrated. Integration is a thin, one-way-first export bridge; Hoflayn is treated as *one provider among several*. |
| P7 | Edge for latency, workers for work | Edge/middleware handles auth, flags, rate limiting and fast credit checks. Long/expensive work runs in an async job runtime (ADR-009). |

## Architecture Decision Records

| ADR | Decision | Rationale |
|-----|----------|-----------|
| 001 | Single Next.js app now; Turborepo later | Solo dev velocity; extract to packages on signal. |
| 002 | Supabase (Postgres + Auth + Storage) | One platform; RLS for isolation. Exit path: standard Postgres + S3-compatible storage. |
| 003 | Drizzle ORM | SQL-close, lightweight, migrations as SQL. |
| 004 | Next.js App Router | RSC, Server Actions, streaming; Vercel-native. |
| 005 | AI abstraction + job queue | Provider swap in one place; central cost control + circuit breaker. |
| 006 | Bridge over migration | PHP untouched; integration via a single external API + webhook. **No "single data model" end-state** — the two systems stay separate bounded contexts. |
| 007 | Entitlements now, flag engine later | Plan entitlements + a few kill switches first; full flag engine when needed. |
| 008 | **Modular monolith** | One deploy unit. Extract a module to its own service only when a measured signal appears (cost/CPU/scaling/team). |
| 009 | **Async job runtime ≠ Edge** | Edge is timeout/CPU limited. Long AI/PDF work runs in a queue + worker (candidates: Inngest / Trigger.dev / Node worker). |
| 010 | **Identity separate, soft-link** | `users` ⟷ `tenants` via `memberships`. Marketplace link is by email; SSO is later ([ADR-016](ADR-016-marketplace-identity.md)). |
| 011 | Billing geography (provisional) | Billing uses a provider abstraction with Stripe Checkout in test mode. A Turkish PSP can be added as another adapter before local pricing is locked. |
| 012 | **Hybrid data access** | Trusted server mutations use privileged Drizzle (`DATABASE_URL`) **with mandatory app-layer membership checks**. RLS (`FORCE`) defends any path using the Supabase `authenticated`/`anon` roles (PostgREST, client). Never disable RLS; never skip the membership filter in app code. |
| 013 | **Post-beta posture** (proposed) | Monolith continues; AI worker extraction deferred with numeric triggers; in-memory rate limit accepted as debt; bridge stays one-way; scope requires evidence. Thresholds live in [`ROADMAP.md`](ROADMAP.md) §B. |
| 014 | **Expo Universal client, mobile first** | Producer UI is one Expo Router codebase targeting Android/iOS first and web second. Next.js remains the trusted API/job/webhook runtime and optional ops UI. Native clients authenticate with Supabase and call versioned `/api/v1` routes using bearer JWTs. This does not change ADR-006: the Bridge remains server-to-server between the independent SaaS and PHP marketplace. |
| 016 | **Workbench ↔ marketplace identity** | No shared MySQL/Supabase. Email is the join key. Android v1 is the atelier desk; hoflayn.com stays the shop. SSO and in-app listings come later. |

## Runtime topology

```text
Expo Universal (Android / iOS / Web)
                  |
          Bearer JWT + JSON
                  |
          Next.js /api/v1
        / AI / credits / billing
                  |
       Supabase Postgres/Auth/Storage
                  |
          controlled Bridge
                  |
       Hoflayn Web PHP marketplace
```

Expo contains public Supabase and API configuration only. Database credentials,
service-role keys, provider tokens, billing secrets and Bridge secrets remain in
the Next.js runtime. Server Actions are a web adapter; `/api/v1` is the stable
producer-client boundary.

## Data model (core, Stage 0)

- `users` — mirrors Supabase `auth.users` (same id).
- `tenants` — a workshop; unit of isolation; holds denormalized `credit_balance`.
- `memberships` — user↔tenant with role (owner/admin/member).
- `plans` / `tenant_entitlements` — access rights (flags/limits).
- `credit_transactions` — append-only credit ledger (usage right).
- `ai_jobs` / `ai_usage_logs` — async AI backbone + per-call cost.
- `media_assets` — storage metadata (bytes in Supabase Storage, tenant-prefixed).

Hoflayn Web/marketplace links (e.g. `sync_links`) are added in the Bridge stage, so
core stays free of marketplace coupling.

## Open decisions (need input)

- **ADR-011 follow-up**: validate Stripe availability and tax/currency fit before production launch in Türkiye.
- Quality bar for "showcase" scenes: fast-good vs studio-grade → provider choice.
- First 90-day success metric (drives what we optimize).

Beta answers several of these; see [`RETRO.md`](RETRO.md) §6 and
[`ROADMAP.md`](ROADMAP.md) §A2.

## Build order (loop stages)

0. Foundation — Next.js, modular layout, Drizzle core schema, Supabase wiring ✅
1. Auth + tenant/membership + RLS + entitlements ✅
2. Credits + `ai_jobs` backbone + AI provider abstraction ✅
3. Onboarding (1 screen) + AI Photo Studio MVP (remove-bg / white-bg) ✅
4. Billing (one paid plan) + credit purchase ✅
5. Product card + AI description ✅
6. Bridge export (Hoflayn) ✅
7. Beta hardening ✅
8. Cost calibration + credit margin ✅
9. Beta launch checklist (ops + freeze) ✅
10. Stripe live cutover readiness ✅
11. Instagram caption MVP ✅
12. Closed beta invite + onboarding polish ✅
13. Analytics lite (funnel events + cohort report) ✅
14. Beta retro template + v1 roadmap + ADR-013 ✅
15. v1 launch blockers (billing lifecycle, password reset, settings, storage GC) ✅
U1. Expo Universal revision (mobile-first client + bearer API + shared contracts) ✅

Next remains Stage 16: run the mobile smoke test and closed beta, fill
[`RETRO.md`](RETRO.md), then decide v1 scope from [`ROADMAP.md`](ROADMAP.md).
Remaining launch gates include real-device verification and Stripe live env
cutover.
