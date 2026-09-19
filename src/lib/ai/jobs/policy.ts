import {
  CircuitOpenError,
  ProviderError,
} from "@/lib/ai/types";

export const DEFAULT_MAX_JOB_ATTEMPTS = 3;
export const STALE_JOB_AFTER_MS = 10 * 60 * 1000;

export function retryDelayMs(attempt: number): number {
  const safeAttempt = Math.max(1, Math.min(attempt, 8));
  return Math.min(15 * 60 * 1000, 30_000 * 2 ** (safeAttempt - 1));
}

export function shouldRetryJob(error: unknown, attempts: number, maxAttempts: number) {
  if (attempts >= maxAttempts) return false;
  if (error instanceof CircuitOpenError) return true;
  return error instanceof ProviderError && error.retryable;
}

export function shouldDeferAiJobs(): boolean {
  if (process.env.AI_JOBS_INLINE === "true") return false;
  if (process.env.AI_JOBS_INLINE === "false") return true;
  return process.env.NODE_ENV === "production";
}
