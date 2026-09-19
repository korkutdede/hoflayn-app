/**
 * In-memory circuit breaker (Stage 2). Fine for a single Node process;
 * replace with Redis/shared store when workers scale out (ADR-009).
 */

type BreakerState = {
  failures: number;
  openUntil: number | null;
};

const DEFAULT_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;

const states = new Map<string, BreakerState>();

function getState(providerId: string): BreakerState {
  let s = states.get(providerId);
  if (!s) {
    s = { failures: 0, openUntil: null };
    states.set(providerId, s);
  }
  return s;
}

export function isCircuitOpen(providerId: string, now = Date.now()): boolean {
  const s = getState(providerId);
  if (s.openUntil == null) return false;
  if (now >= s.openUntil) {
    s.openUntil = null;
    s.failures = 0;
    return false;
  }
  return true;
}

export function recordSuccess(providerId: string): void {
  const s = getState(providerId);
  s.failures = 0;
  s.openUntil = null;
}

export function recordFailure(
  providerId: string,
  opts?: { threshold?: number; cooldownMs?: number; now?: number },
): void {
  const threshold = opts?.threshold ?? DEFAULT_THRESHOLD;
  const cooldownMs = opts?.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const now = opts?.now ?? Date.now();
  const s = getState(providerId);
  s.failures += 1;
  if (s.failures >= threshold) {
    s.openUntil = now + cooldownMs;
  }
}

/** Test helper — resets all breakers. */
export function resetCircuitBreakers(): void {
  states.clear();
}
