import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExpenseProfitInput,
  calculateDesi,
  calculateProfit,
  formatMinor,
  parseMoneyToMinor,
  summarizeExpenseLedger,
} from "../packages/calc/src/index";

test("money parses and formats minor units without float drift", () => {
  assert.equal(parseMoneyToMinor("12.34"), 1234);
  assert.equal(parseMoneyToMinor("0.1"), 10);
  assert.equal(formatMinor(1234), "12.34");
  assert.equal(formatMinor(10), "0.10");
});

test("desi uses carrier divisor and billable weight", () => {
  const result = calculateDesi({
    lengthCm: 30,
    widthCm: 20,
    heightCm: 10,
    weightKg: 1.2,
    carrierId: "yurtici",
  });
  assert.equal(result.volumeCm3, 6000);
  assert.equal(result.divisor, 3000);
  assert.equal(result.desi, 2);
  assert.equal(result.billableWeightKg, 2);
});

test("desi custom divisor and missing weight assumptions", () => {
  const result = calculateDesi({
    lengthCm: 40,
    widthCm: 30,
    heightCm: 20,
    carrierId: "custom",
    divisor: 4000,
  });
  assert.equal(result.desi, 6);
  assert.equal(result.billableWeightKg, 6);
  assert.ok(result.assumptions.length > 0);
  assert.equal(typeof result.assumptions[0], "object");
  assert.ok(
    result.assumptions.some(
      (item) =>
        typeof item !== "string" && item.messageKey === "calc.desi.weightMissing",
    ),
  );
});

test("profit covers zero sell price and target margin", () => {
  const result = calculateProfit({
    components: {
      materials: "100.00",
      labor: "50.00",
      packaging: "10.00",
    },
    sellPrice: "200.00",
    targetMarginPercent: 20,
    quantity: 1,
  });
  assert.equal(result.batchCost, "160.00");
  assert.equal(result.unitCost, "160.00");
  assert.equal(result.grossProfit, "40.00");
  assert.equal(result.marginPercent, 20);
  assert.equal(result.targetPrice, "200.00");
  assert.equal(result.totalProfit, "40.00");
});

test("quantity splits production costs; shipping stays per unit", () => {
  const result = calculateProfit({
    components: {
      materials: "100.00",
      labor: "50.00",
      packaging: "10.00",
      shipping: "20.00",
    },
    sellPrice: "120.00",
    targetMarginPercent: 20,
    quantity: 2,
  });
  // (160/2) + 20 = 100 unit cost
  assert.equal(result.batchCost, "160.00");
  assert.equal(result.unitCost, "100.00");
  assert.equal(result.targetPrice, "125.00");
  assert.equal(result.grossProfit, "20.00");
});

test("commission percent raises target sell price", () => {
  const result = calculateProfit({
    components: {
      materials: "100.00",
    },
    targetMarginPercent: 20,
    commissionPercent: 10,
    quantity: 1,
  });
  // sell = 100 / (1 - 0.20 - 0.10) = 100 / 0.7 ≈ 142.86
  assert.equal(result.unitCost, "100.00");
  assert.equal(result.targetPrice, "142.86");
  assert.equal(result.commissionPercent, 10);
});

test("profit does not invent certainty when sell price missing", () => {
  const result = calculateProfit({
    components: { materials: "80" },
  });
  assert.equal(result.unitCost, "80.00");
  assert.equal(result.sellPrice, null);
  assert.equal(result.marginPercent, null);
  assert.ok(result.missing.includes("sellPrice"));
});

test("high yield keeps batch total and integer unit minor", () => {
  const result = calculateProfit({
    components: { materials: "100.00" },
    sellPrice: "0.50",
    quantity: 4,
  });
  assert.equal(result.batchCost, "100.00");
  assert.equal(result.unitCost, "25.00");
  assert.equal(result.totalCost, "100.00");
  assert.equal(result.totalRevenue, "2.00");
  assert.equal(result.totalProfit, "-98.00");
});
test("expense ledger builds single-line input and summarizes month", () => {
  const input = buildExpenseProfitInput({
    category: "materials",
    amount: "120.50",
    note: "ceviz levha",
    occurredAt: "2026-08-05T10:00:00.000Z",
  });
  assert.equal(input.components.materials, "120.50");
  assert.equal(input.ledger.category, "materials");
  const result = calculateProfit(input);
  assert.equal(result.unitCost, "120.50");

  const summary = summarizeExpenseLedger(
    [
      { amountMinor: 12050, at: "2026-08-05T10:00:00.000Z" },
      { amountMinor: 5000, at: "2026-07-01T10:00:00.000Z" },
    ],
    new Date("2026-08-10T12:00:00.000Z"),
  );
  assert.equal(summary.allTimeMinor, 17050);
  assert.equal(summary.monthMinor, 12050);
  assert.equal(summary.monthCount, 1);
  assert.equal(summary.count, 2);
});
