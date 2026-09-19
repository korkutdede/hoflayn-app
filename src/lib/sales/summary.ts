/**
 * Pure sales analytics helpers (Loop 23).
 * Windows use UTC calendar days: today = from 00:00 UTC through `now`.
 * Metrics come from sale_lines (atomically tied to stock_movements.out).
 */

export type SaleSummaryWindowMetrics = {
  revenueMinor: number;
  quantitySold: number;
  saleCount: number;
};

export type SaleSummaryTopProduct = {
  productId: string;
  productName: string;
  quantitySold: number;
  revenueMinor: number;
};

export type SaleSummaryInputSale = {
  id: string;
  soldAt: Date;
  totalMinor: number;
  status: string;
};

export type SaleSummaryInputLine = {
  saleId: string;
  productId: string;
  quantity: number;
  lineTotalMinor: number;
  productNameSnapshot: string;
};

export function windowStarts(now: Date) {
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dayMs = 24 * 60 * 60 * 1000;
  return {
    todayStart,
    last7Start: new Date(todayStart.getTime() - 6 * dayMs),
    last30Start: new Date(todayStart.getTime() - 29 * dayMs),
  };
}

function emptyWindow(): SaleSummaryWindowMetrics {
  return { revenueMinor: 0, quantitySold: 0, saleCount: 0 };
}

export function buildSalesSummary(opts: {
  now: Date;
  sales: SaleSummaryInputSale[];
  lines: SaleSummaryInputLine[];
  productId?: string | null;
  topN?: number;
}): {
  currency: string;
  windows: {
    today: SaleSummaryWindowMetrics;
    last7Days: SaleSummaryWindowMetrics;
    last30Days: SaleSummaryWindowMetrics;
  };
  topProducts: SaleSummaryTopProduct[];
} {
  const topN = Math.min(50, Math.max(1, opts.topN ?? 5));
  const { todayStart, last7Start, last30Start } = windowStarts(opts.now);

  const completed = opts.sales.filter((s) => s.status === "completed");
  const completedIds = new Set(completed.map((s) => s.id));
  let lines = opts.lines.filter((l) => completedIds.has(l.saleId));
  if (opts.productId) {
    lines = lines.filter((l) => l.productId === opts.productId);
  }
  const saleById = new Map(completed.map((s) => [s.id, s]));

  function metricsSince(from: Date): SaleSummaryWindowMetrics {
    const inWindow = lines.filter((l) => {
      const sale = saleById.get(l.saleId);
      return sale && sale.soldAt >= from && sale.soldAt <= opts.now;
    });
    if (!inWindow.length) return emptyWindow();

    const saleIds = new Set(inWindow.map((l) => l.saleId));
    let revenueMinor = 0;
    let quantitySold = 0;
    for (const line of inWindow) {
      revenueMinor += line.lineTotalMinor;
      quantitySold += line.quantity;
    }

    // Header total when unfiltered (matches sale record / stock-linked sale).
    if (!opts.productId) {
      revenueMinor = 0;
      for (const id of saleIds) {
        revenueMinor += saleById.get(id)?.totalMinor ?? 0;
      }
    }

    return {
      revenueMinor,
      quantitySold,
      saleCount: saleIds.size,
    };
  }

  const lines30 = lines.filter((l) => {
    const sale = saleById.get(l.saleId);
    return sale && sale.soldAt >= last30Start && sale.soldAt <= opts.now;
  });

  const byProduct = new Map<
    string,
    { productName: string; quantitySold: number; revenueMinor: number }
  >();
  for (const line of lines30) {
    const cur = byProduct.get(line.productId) ?? {
      productName: line.productNameSnapshot,
      quantitySold: 0,
      revenueMinor: 0,
    };
    cur.quantitySold += line.quantity;
    cur.revenueMinor += line.lineTotalMinor;
    byProduct.set(line.productId, cur);
  }

  const topProducts = [...byProduct.entries()]
    .map(([productId, v]) => ({
      productId,
      productName: v.productName,
      quantitySold: v.quantitySold,
      revenueMinor: v.revenueMinor,
    }))
    .sort(
      (a, b) =>
        b.quantitySold - a.quantitySold || b.revenueMinor - a.revenueMinor,
    )
    .slice(0, topN);

  return {
    currency: "TRY",
    windows: {
      today: metricsSince(todayStart),
      last7Days: metricsSince(last7Start),
      last30Days: metricsSince(last30Start),
    },
    topProducts,
  };
}
