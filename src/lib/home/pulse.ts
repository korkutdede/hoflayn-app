/**
 * Pure home pulse assembly (Loop 26).
 * Service layer always scopes source queries by tenantId.
 */

export type HomePulseTodaySales = {
  revenueMinor: number;
  quantitySold: number;
  saleCount: number;
};

export type HomePulseRecentSale = {
  id: string;
  totalMinor: number;
  status: string;
  source: string;
  soldAt: string;
  lineCount: number;
};

export type HomePulseInput = {
  creditBalance: number;
  today: HomePulseTodaySales;
  lowStockCount: number;
  recentSales: HomePulseRecentSale[];
};

export function buildHomePulse(input: HomePulseInput) {
  return {
    creditBalance: input.creditBalance,
    todaySales: input.today,
    lowStockCount: input.lowStockCount,
    recentSales: input.recentSales.slice(0, 5),
    empty: {
      noSalesToday: input.today.saleCount === 0,
      noRecentSales: input.recentSales.length === 0,
      noLowStock: input.lowStockCount === 0,
    },
  };
}
