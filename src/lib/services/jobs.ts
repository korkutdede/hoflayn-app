import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiJobs } from "@/db/schema";

export type AiJobRow = typeof aiJobs.$inferSelect;

export function serializeAiJob(job: AiJobRow) {
  return {
    id: job.id,
    module: job.module,
    operation: job.operation,
    status: job.status,
    provider: job.provider,
    creditsReserved: job.creditsReserved,
    creditsCharged: job.creditsCharged,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    output: job.output ?? undefined,
    error: job.error ?? undefined,
    nextAttemptAt: job.nextAttemptAt?.toISOString(),
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    finishedAt: job.finishedAt?.toISOString(),
  };
}

export async function getTenantAiJob(tenantId: string, jobId: string) {
  const [job] = await db
    .select()
    .from(aiJobs)
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.tenantId, tenantId)))
    .limit(1);
  return job ? serializeAiJob(job) : null;
}
