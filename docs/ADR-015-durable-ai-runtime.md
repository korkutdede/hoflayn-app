# ADR-015: Database-backed AI worker

Status: accepted for beta  
Date: 2026-08-09

## Decision

`ai_jobs` remains the durable source of truth. Production API requests enqueue a
job and return immediately. A secret-protected Node.js worker route processes due
jobs in small batches. Vercel Cron invokes that route every minute.

The job lease is an atomic status update guarded by the current status. Jobs
carry a lock token, lock time, next-attempt time and maximum attempt count.
Expired leases are recovered. Transient provider failures use capped exponential
backoff; exhausted jobs enter `dead_letter`.

Credits are reserved once and held across retries. Final failure/dead-letter
refunds once. Credit and provider-usage writes use idempotency keys.

## Why not Trigger.dev yet?

Trigger.dev would provide a stronger hosted execution plane, but it adds another
account, deployment target and operational dependency before beta traffic exists.
The database queue already exists and the current operations complete within the
configured Vercel function duration. This keeps the runtime extractable without
making a hosted worker vendor authoritative for job or credit state.

## Operational constraints

- Production requires `CRON_SECRET` (or `AI_WORKER_SECRET`).
- The one-minute Vercel Cron schedule requires a Vercel plan that supports that
  frequency. On a daily-only plan, invoke the same route from a one-minute
  external scheduler or move to Trigger.dev before enabling deferred jobs.
- `AI_JOBS_INLINE=true` is a local/debug escape hatch, not the production mode.
- Provider requests have bounded timeouts and carry the Hoflayn job id as an
  idempotency key where the provider supports it.

## Extraction signal

Move execution to Trigger.dev or a dedicated worker when any of these occur:

- queue-to-start p95 exceeds two minutes,
- function duration or cron frequency limits delay work,
- sustained throughput requires more than ten jobs per worker invocation,
- multi-step AI workflows need durable step-level recovery.

The external worker must continue to claim and update `ai_jobs`; provider state
must not replace Hoflayn's job ledger.
