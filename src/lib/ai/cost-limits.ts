import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiUsageLogs } from "@/db/schema";
import { LocalizedError } from "@/lib/i18n/error";
import { getEstimatedCostUsd } from "./cost-model";

export class TenantCostCapError extends LocalizedError {
  readonly code = "TENANT_COST_CAP" as const;
  constructor(
    public readonly window: "hourly" | "daily",
    public readonly spentUsd: number,
    public readonly capUsd: number,
  ) {
    super(
      window === "hourly" ? "ai.error.costCapHourly" : "ai.error.costCapDaily",
      { spent: spentUsd.toFixed(3), cap: capUsd },
    );
    this.name = "TenantCostCapError";
  }
}

function readCap(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getTenantCostCaps() {
  const hourly = readCap("HOURLY_TENANT_USD_CAP", 5);
  const daily = readCap("DAILY_TENANT_USD_CAP", 20);
  return {
    hourly,
    daily,
    softHourly: hourly * 0.8,
    softDaily: daily * 0.8,
  };
}

async function sumUsageUsd(
  tenantId: string,
  since: Date,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${aiUsageLogs.costUsd}), 0)`,
    })
    .from(aiUsageLogs)
    .where(
      and(
        eq(aiUsageLogs.tenantId, tenantId),
        gte(aiUsageLogs.createdAt, since),
      ),
    );

  return Number(row?.total ?? 0);
}

/**
 * Soft-warn + hard-reject tenant provider-USD spend windows.
 * Call before reserving credits for a new AI job.
 */
export async function assertTenantCostBudget(opts: {
  tenantId: string;
  operation: string;
}): Promise<{ hourlySpent: number; dailySpent: number }> {
  const caps = getTenantCostCaps();
  const now = Date.now();
  const hourlySpent = await sumUsageUsd(
    opts.tenantId,
    new Date(now - 60 * 60 * 1000),
  );
  const dailySpent = await sumUsageUsd(
    opts.tenantId,
    new Date(now - 24 * 60 * 60 * 1000),
  );

  const projected = getEstimatedCostUsd(opts.operation);

  if (hourlySpent >= caps.softHourly || dailySpent >= caps.softDaily) {
    console.warn(
      JSON.stringify({
        type: "ai_cost_soft_cap",
        tenantId: opts.tenantId,
        operation: opts.operation,
        hourlySpent,
        dailySpent,
        softHourly: caps.softHourly,
        softDaily: caps.softDaily,
      }),
    );
  }

  if (hourlySpent + projected > caps.hourly) {
    throw new TenantCostCapError("hourly", hourlySpent, caps.hourly);
  }

  if (dailySpent + projected > caps.daily) {
    throw new TenantCostCapError("daily", dailySpent, caps.daily);
  }

  return { hourlySpent, dailySpent };
}
