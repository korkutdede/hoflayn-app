import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiJobs, aiUsageLogs, creditTransactions } from "@/db/schema";
import { buildUsageBreakdown } from "@/lib/credits/labels";
import { getTranslator } from "@/lib/i18n/server";

export type TenantCostSummary = {
  windowDays: number;
  estimatedUsd: number;
  creditsUsed: number;
  jobCount: number;
  succeededJobs: number;
  byOperation: ReturnType<typeof buildUsageBreakdown>;
};

/**
 * Last-N-days cost snapshot for the signed-in tenant (self-serve, not global admin).
 * byOperation is credit transparency for mobile (Loop 28); estimatedUsd stays internal.
 */
export async function getTenantCostSummary(
  tenantId: string,
  windowDays = 7,
): Promise<TenantCostSummary> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [usage] = await db
    .select({
      estimatedUsd: sql<string>`coalesce(sum(${aiUsageLogs.costUsd}), 0)`,
    })
    .from(aiUsageLogs)
    .where(
      and(
        eq(aiUsageLogs.tenantId, tenantId),
        gte(aiUsageLogs.createdAt, since),
      ),
    );

  const [credits] = await db
    .select({
      // usage rows are negative amounts
      used: sql<string>`coalesce(sum(abs(${creditTransactions.amount})), 0)`,
    })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.tenantId, tenantId),
        eq(creditTransactions.type, "usage"),
        gte(creditTransactions.createdAt, since),
      ),
    );

  const [jobs] = await db
    .select({
      total: sql<number>`count(*)::int`,
      succeeded: sql<number>`count(*) filter (where ${aiJobs.status} = 'succeeded')::int`,
    })
    .from(aiJobs)
    .where(
      and(eq(aiJobs.tenantId, tenantId), gte(aiJobs.createdAt, since)),
    );

  const operationRows = await db
    .select({
      operation: aiJobs.operation,
      creditsUsed: sql<number>`coalesce(sum(${aiJobs.creditsCharged}), 0)::int`,
      jobCount: sql<number>`count(*)::int`,
    })
    .from(aiJobs)
    .where(
      and(
        eq(aiJobs.tenantId, tenantId),
        gte(aiJobs.createdAt, since),
        sql`${aiJobs.creditsCharged} > 0`,
      ),
    )
    .groupBy(aiJobs.operation)
    .orderBy(desc(sql`coalesce(sum(${aiJobs.creditsCharged}), 0)`));

  return {
    windowDays,
    estimatedUsd: Number(usage?.estimatedUsd ?? 0),
    creditsUsed: Number(credits?.used ?? 0),
    jobCount: Number(jobs?.total ?? 0),
    succeededJobs: Number(jobs?.succeeded ?? 0),
    byOperation: buildUsageBreakdown(
      operationRows.map((r) => ({
        operation: r.operation,
        creditsUsed: Number(r.creditsUsed ?? 0),
        jobCount: Number(r.jobCount ?? 0),
      })),
      await getTranslator(),
    ),
  };
}
