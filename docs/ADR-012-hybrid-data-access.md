# ADR-012 — Hybrid data access (Drizzle + RLS)

## Status

Accepted (Stage 1)

## Context

We use Supabase Auth (JWT) and Postgres with Row Level Security, while app
mutations run through Drizzle over `DATABASE_URL` (typically the `postgres`
role / pooler), which **bypasses RLS**.

Two pure options were considered:

1. **Authenticated Drizzle only** — set `request.jwt.claim.sub` / use a
   user-scoped connection so RLS applies to every query. Hard with
   serverless poolers; slow and fragile for transactions (provisioning,
   credit ledger).
2. **Service-role / privileged only** — ignore RLS, trust app code. Fast, but
   a single missing `WHERE tenant_id = …` becomes a cross-tenant incident;
   also leaves PostgREST/Storage client paths unprotected.

## Decision

**Hybrid (dual control, P3):**

| Path | Mechanism |
|------|-----------|
| Server Actions / RSC data (Drizzle) | Privileged connection + **mandatory** membership check via `requireTenant()` / explicit `tenantId` from `TenantContext` before any write |
| Supabase JS client / PostgREST / future Realtime | **RLS FORCE** on all tenant tables; `is_member_of(tenant_id)` helper |
| Storage | Tenant-prefixed paths + bucket policies (Stage 3+) |

Provisioning, credit grants, and AI job settlement always go through Drizzle
inside a transaction after identity is established from `supabase.auth.getUser()`.

## Consequences

- RLS SQL lives in `drizzle/0001_rls_and_seed.sql` and must stay enabled.
- App code must never query tenant data without a resolved `TenantContext`.
- Do not use the anon key for privileged server writes.
- When we later extract a worker, it uses the same privileged Drizzle path and
  the same membership/tenant id taken from the job row (already scoped).
