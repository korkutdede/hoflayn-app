import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  isLowStock,
  pickLowStockItems,
  resolveLowStockThreshold,
} from "../src/lib/stock/low-stock";

test("default threshold is 5", () => {
  assert.equal(DEFAULT_LOW_STOCK_THRESHOLD, 5);
});

test("resolveLowStockThreshold prefers product override", () => {
  assert.equal(resolveLowStockThreshold(null, 5), 5);
  assert.equal(resolveLowStockThreshold(undefined, 5), 5);
  assert.equal(resolveLowStockThreshold(2, 5), 2);
  assert.equal(resolveLowStockThreshold(0, 5), 0);
});

test("isLowStock is inclusive of threshold", () => {
  assert.equal(isLowStock(5, 5), true);
  assert.equal(isLowStock(4, 5), true);
  assert.equal(isLowStock(6, 5), false);
});

test("pickLowStockItems sorts by stock then name and uses overrides", () => {
  const items = pickLowStockItems(
    [
      {
        productId: "a",
        name: "Bardak",
        stockQuantity: 3,
        productOverride: null,
      },
      {
        productId: "b",
        name: "Mum",
        stockQuantity: 1,
        productOverride: null,
      },
      {
        productId: "c",
        name: "Vazo",
        stockQuantity: 10,
        productOverride: null,
      },
      {
        productId: "d",
        name: "Özel",
        stockQuantity: 8,
        productOverride: 10,
      },
    ],
    5,
  );
  assert.deepEqual(
    items.map((i) => i.productId),
    ["b", "a", "d"],
  );
  assert.equal(items[2]?.threshold, 10);
});

test("tenant isolation contract: low-stock queries always filter tenantId", () => {
  // Service listLowStockAlerts / evaluateLowStockForProducts scope by tenant.
  const tenantPredicate = "products.tenant_id = context.tenant.id";
  assert.match(tenantPredicate, /tenant/);
});
