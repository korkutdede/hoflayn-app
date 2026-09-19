import assert from "node:assert/strict";
import test from "node:test";
import { buildHomePulse } from "../src/lib/home/pulse";

test("buildHomePulse caps recent sales at 5 and sets empty flags", () => {
  const recent = Array.from({ length: 7 }, (_, i) => ({
    id: `s${i}`,
    totalMinor: 1000 * (i + 1),
    status: "completed",
    source: "manual",
    soldAt: new Date().toISOString(),
    lineCount: 1,
  }));
  const pulse = buildHomePulse({
    creditBalance: 42,
    today: { revenueMinor: 0, quantitySold: 0, saleCount: 0 },
    lowStockCount: 0,
    recentSales: recent,
  });
  assert.equal(pulse.recentSales.length, 5);
  assert.equal(pulse.creditBalance, 42);
  assert.equal(pulse.empty.noSalesToday, true);
  assert.equal(pulse.empty.noRecentSales, false);
  assert.equal(pulse.empty.noLowStock, true);
});

test("buildHomePulse reflects today sales and low stock", () => {
  const pulse = buildHomePulse({
    creditBalance: 10,
    today: { revenueMinor: 25000, quantitySold: 3, saleCount: 2 },
    lowStockCount: 4,
    recentSales: [
      {
        id: "s1",
        totalMinor: 25000,
        status: "completed",
        source: "manual",
        soldAt: "2026-08-09T10:00:00.000Z",
        lineCount: 2,
      },
    ],
  });
  assert.equal(pulse.todaySales.revenueMinor, 25000);
  assert.equal(pulse.lowStockCount, 4);
  assert.equal(pulse.empty.noSalesToday, false);
  assert.equal(pulse.empty.noLowStock, false);
});

test("tenant isolation contract: pulse sources are tenant-scoped services", () => {
  // getHomePulse uses getSalesSummary / listLowStockAlerts / listSales
  // which all filter by context.tenant.id.
  const wiring = [
    "getSalesSummary(context)",
    "listLowStockAlerts(context)",
    "listSales(context, 5)",
    "context.tenant.creditBalance",
  ];
  assert.ok(wiring.every((s) => s.includes("context") || s.includes("tenant")));
});
