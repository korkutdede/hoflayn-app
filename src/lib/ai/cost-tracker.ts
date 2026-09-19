import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiUsageLogs } from "@/db/schema";

export type UsageLogInput = {
  tenantId: string;
  aiJobId: string;
  provider: string;
  model?: string;
  costUsd: number;
  latencyMs?: number;
};

/** Append a provider cost row (P5). Separate from credit ledger. */
export async function logAiUsage(input: UsageLogInput): Promise<string> {
  const idempotencyKey = `ai-job:${input.aiJobId}:provider:${input.provider}`;
  const [row] = await db
    .insert(aiUsageLogs)
    .values({
      tenantId: input.tenantId,
      aiJobId: input.aiJobId,
      provider: input.provider,
      model: input.model,
      costUsd: input.costUsd.toFixed(5),
      latencyMs: input.latencyMs,
      idempotencyKey,
    })
    .onConflictDoNothing()
    .returning({ id: aiUsageLogs.id });

  if (row) return row.id;
  const [existing] = await db
    .select({ id: aiUsageLogs.id })
    .from(aiUsageLogs)
    .where(eq(aiUsageLogs.idempotencyKey, idempotencyKey))
    .limit(1);
  if (!existing) throw new Error("logAiUsage: insert failed");
  return existing.id;
}

export async function getJobUsageTotalUsd(aiJobId: string): Promise<number> {
  const rows = await db
    .select({ costUsd: aiUsageLogs.costUsd })
    .from(aiUsageLogs)
    .where(eq(aiUsageLogs.aiJobId, aiJobId));

  return rows.reduce((sum, r) => sum + Number(r.costUsd), 0);
}
