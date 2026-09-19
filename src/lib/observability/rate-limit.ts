import "server-only";
import { logEvent } from "@/lib/observability/log";

/**
 * In-memory sliding-window rate limiter (per key).
 * Adequate for a single-node beta; swap for Redis/Upstash when workers scale
 * out (same posture as the AI circuit breaker — ADR-009).
 */
type Bucket = number[];
const buckets = new Map<string, Bucket>();

function readLimit(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterMs: number;
};

/**
 * Allows up to `limit` events per `windowMs` for a key.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
  now = Date.now(),
): RateLimitResult {
  const since = now - windowMs;
  const bucket = (buckets.get(key) ?? []).filter((t) => t > since);

  if (bucket.length >= limit) {
    const oldest = bucket[0] ?? now;
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      limit,
      retryAfterMs: Math.max(0, oldest + windowMs - now),
    };
  }

  bucket.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: limit - bucket.length,
    limit,
    retryAfterMs: 0,
  };
}

/** Studio job submissions per tenant per minute. */
export function checkStudioRateLimit(tenantId: string): RateLimitResult {
  const limit = readLimit("STUDIO_JOBS_PER_MINUTE", 10);
  const result = checkRateLimit(`studio:${tenantId}`, limit, 60_000);
  if (!result.allowed) {
    logEvent(
      "ratelimit.blocked",
      { scope: "studio", tenantId, limit: result.limit },
      "warn",
    );
  }
  return result;
}
