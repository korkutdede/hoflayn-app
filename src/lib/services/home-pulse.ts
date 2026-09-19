import "server-only";
import type { TenantContext } from "@/lib/auth/session";
import { buildHomePulse } from "@/lib/home/pulse";
import { listLowStockAlerts } from "@/lib/services/low-stock";
import { getSalesSummary, listSales } from "@/lib/services/sales";

export { buildHomePulse };

/**
 * Workshop home pulse — members may read (tenant-scoped).
 */
export async function getHomePulse(context: TenantContext) {
  const [summary, lowStock, recent] = await Promise.all([
    getSalesSummary(context, { topN: 1 }),
    listLowStockAlerts(context),
    listSales(context, 5),
  ]);

  return buildHomePulse({
    creditBalance: context.tenant.creditBalance,
    today: summary.windows.today,
    lowStockCount: lowStock.count,
    recentSales: recent.map((sale) => ({
      id: sale.id,
      totalMinor: sale.totalMinor,
      status: sale.status,
      source: sale.source,
      soldAt: sale.soldAt,
      lineCount: sale.lines.length,
    })),
  });
}
