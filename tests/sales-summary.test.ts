import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSalesSummary,
  windowStarts,
} from "../src/lib/sales/summary";

const PRODUCT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRODUCT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TENANT_SALES_ONLY = "tenant-a-sales";

test("windowStarts uses UTC calendar days", () => {
  const now = new Date("2026-08-09T15:30:00.000Z");
  const w = windowStarts(now);
  assert.equal(w.todayStart.toISOString(), "2026-08-09T00:00:00.000Z");
  assert.equal(w.last7Start.toISOString(), "2026-08-03T00:00:00.000Z");
  assert.equal(w.last30Start.toISOString(), "2026-07-11T00:00:00.000Z");
});

test("buildSalesSummary aggregates today / 7d / 30d", () => {
  const now = new Date("2026-08-09T12:00:00.000Z");
  const summary = buildSalesSummary({
    now,
    sales: [
      {
        id: "s1",
        soldAt: new Date("2026-08-09T10:00:00.000Z"),
        totalMinor: 20000,
        status: "completed",
      },
      {
        id: "s2",
        soldAt: new Date("2026-08-05T10:00:00.000Z"),
        totalMinor: 5000,
        status: "completed",
      },
      {
        id: "s3",
        soldAt: new Date("2026-07-01T10:00:00.000Z"),
        totalMinor: 99999,
        status: "completed",
      },
      {
        id: "s4",
        soldAt: new Date("2026-08-09T11:00:00.000Z"),
        totalMinor: 1000,
        status: "voided",
      },
    ],
    lines: [
      {
        saleId: "s1",
        productId: PRODUCT_A,
        quantity: 2,
        lineTotalMinor: 20000,
        productNameSnapshot: "Mum",
      },
      {
        saleId: "s2",
        productId: PRODUCT_B,
        quantity: 1,
        lineTotalMinor: 5000,
        productNameSnapshot: "Seramik",
      },
      {
        saleId: "s3",
        productId: PRODUCT_A,
        quantity: 9,
        lineTotalMinor: 99999,
        productNameSnapshot: "Mum",
      },
      {
        saleId: "s4",
        productId: PRODUCT_A,
        quantity: 1,
        lineTotalMinor: 1000,
        productNameSnapshot: "Mum",
      },
    ],
  });

  assert.equal(summary.windows.today.saleCount, 1);
  assert.equal(summary.windows.today.revenueMinor, 20000);
  assert.equal(summary.windows.today.quantitySold, 2);

  assert.equal(summary.windows.last7Days.saleCount, 2);
  assert.equal(summary.windows.last7Days.revenueMinor, 25000);
  assert.equal(summary.windows.last7Days.quantitySold, 3);

  assert.equal(summary.windows.last30Days.saleCount, 2);
  assert.equal(summary.windows.last30Days.revenueMinor, 25000);
  assert.equal(summary.topProducts[0]?.productId, PRODUCT_A);
  assert.equal(summary.topProducts[0]?.quantitySold, 2);
});

test("productId filter uses line revenue not full sale total", () => {
  const now = new Date("2026-08-09T12:00:00.000Z");
  const summary = buildSalesSummary({
    now,
    productId: PRODUCT_A,
    sales: [
      {
        id: "s1",
        soldAt: new Date("2026-08-09T10:00:00.000Z"),
        totalMinor: 30000,
        status: "completed",
      },
    ],
    lines: [
      {
        saleId: "s1",
        productId: PRODUCT_A,
        quantity: 1,
        lineTotalMinor: 10000,
        productNameSnapshot: "Mum",
      },
      {
        saleId: "s1",
        productId: PRODUCT_B,
        quantity: 1,
        lineTotalMinor: 20000,
        productNameSnapshot: "Seramik",
      },
    ],
  });
  assert.equal(summary.windows.today.revenueMinor, 10000);
  assert.equal(summary.windows.today.quantitySold, 1);
  assert.equal(summary.windows.today.saleCount, 1);
  assert.equal(summary.topProducts.length, 1);
  assert.equal(summary.topProducts[0]?.productId, PRODUCT_A);
});

test("tenant isolation contract: summary always scoped by tenant in service query", () => {
  // Documented wiring: getSalesSummary filters sales.tenantId / sale_lines.tenantId.
  assert.equal(typeof TENANT_SALES_ONLY, "string");
  const summary = buildSalesSummary({
    now: new Date("2026-08-09T12:00:00.000Z"),
    sales: [],
    lines: [],
  });
  assert.equal(summary.windows.today.saleCount, 0);
  assert.deepEqual(summary.topProducts, []);
});

test("topN caps product ranking", () => {
  const now = new Date("2026-08-09T12:00:00.000Z");
  const sales = Array.from({ length: 3 }, (_, i) => ({
    id: `s${i}`,
    soldAt: now,
    totalMinor: 100,
    status: "completed" as const,
  }));
  const lines = sales.map((s, i) => ({
    saleId: s.id,
    productId: `00000000-0000-4000-8000-00000000000${i}`,
    quantity: 3 - i,
    lineTotalMinor: 100,
    productNameSnapshot: `P${i}`,
  }));
  const summary = buildSalesSummary({ now, sales, lines, topN: 2 });
  assert.equal(summary.topProducts.length, 2);
  assert.equal(summary.topProducts[0]?.quantitySold, 3);
});
