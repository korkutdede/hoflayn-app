import "server-only";
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { aiJobs } from "@/db/schema";
import { processAiJob } from "@/lib/ai/jobs/runner";
import { STALE_JOB_AFTER_MS } from "@/lib/ai/jobs/policy";
import { logEvent } from "@/lib/observability/log";

export type WorkerRunSummary = {
  recovered: number;
  selected: number;
  succeeded: number;
  retryLater: number;
  failed: number;
  deadLetter: number;
  workerErrors: number;
};

export async function recoverStaleAiJobs(now = new Date()): Promise<number> {
  const staleBefore = new Date(now.getTime() - STALE_JOB_AFTER_MS);
  const rows = await db
    .update(aiJobs)
    .set({
      status: "retry_later",
      nextAttemptAt: now,
      lockedAt: null,
      lockToken: null,
      error: "Worker lease expired; job scheduled for recovery.",
    })
    .where(and(eq(aiJobs.status, "running"), lte(aiJobs.lockedAt, staleBefore)))
    .returning({ id: aiJobs.id });
  return rows.length;
}

export async function processDueAiJobs(
  limit = 3,
  now = new Date(),
): Promise<WorkerRunSummary> {
  const safeLimit = Math.max(1, Math.min(limit, 10));
  const recovered = await recoverStaleAiJobs(now);
  const due = await db
    .select({ id: aiJobs.id })
    .from(aiJobs)
    .where(
      or(
        eq(aiJobs.status, "pending"),
        and(
          eq(aiJobs.status, "retry_later"),
          or(isNull(aiJobs.nextAttemptAt), lte(aiJobs.nextAttemptAt, now)),
        ),
      ),
    )
    .orderBy(asc(aiJobs.createdAt))
    .limit(safeLimit);

  const summary: WorkerRunSummary = {
    recovered,
    selected: due.length,
    succeeded: 0,
    retryLater: 0,
    failed: 0,
    deadLetter: 0,
    workerErrors: 0,
  };
  for (const item of due) {
    try {
      const result = await processAiJob(item.id);
      if (result.status === "succeeded") summary.succeeded += 1;
      else if (result.status === "retry_later") summary.retryLater += 1;
      else if (result.status === "dead_letter") summary.deadLetter += 1;
      else if (result.status === "failed") summary.failed += 1;
    } catch (error) {
      summary.workerErrors += 1;
      logEvent(
        "ai_worker.job_error",
        {
          jobId: item.id,
          error: error instanceof Error ? error.message : String(error),
        },
        "error",
      );
    }
  }
  return summary;
}
