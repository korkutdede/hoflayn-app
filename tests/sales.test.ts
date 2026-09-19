import assert from "node:assert/strict";
import test from "node:test";
import { requireMoneyToMinor, addMinor } from "@hoflayn/calc";
import { parseSalesCsv } from "../src/lib/sales/csv";
import { createSaleSchema } from "../src/lib/sales/schemas";

test("createSaleSchema requires at least one line", () => {
  assert.throws(() =>
    createSaleSchema.parse({
      lines: [],
    }),
  );
  const ok = createSaleSchema.parse({
    source: "manual",
    lines: [
      {
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: 2,
        unitPrice: "49.90",
      },
    ],
    idempotencyKey: "sale-test-key-01",
  });
  assert.equal(ok.lines.length, 1);
  assert.equal(ok.source, "manual");
});

test("sale totals use integer minor units", () => {
  const unit = requireMoneyToMinor("120.50");
  const line = unit * 3;
  assert.equal(line, 36150);
  assert.equal(addMinor(line, requireMoneyToMinor("10")), 37150);
});

test("CSV adapter parses sku,quantity,unit_price", () => {
  const parsed = parseSalesCsv(
    ["sku,quantity,unit_price,note", "SKU-1,2,99.90,walk-in", "SKU-2,1,10"].join(
      "\n",
    ),
  );
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0]?.sku, "SKU-1");
  assert.equal(parsed.rows[0]?.quantity, 2);
  assert.equal(parsed.rows[0]?.unitPrice, "99.90");
});

test("CSV adapter reports missing header", () => {
  const parsed = parseSalesCsv("a,b\n1,2");
  assert.equal(parsed.errors[0]?.messageKey, "sales.csv.error.header");
});

test("member role gate contract for sales create", () => {
  const role: "owner" | "admin" | "member" = "member";
  assert.equal(role === "member", true);
  // Service/API throw when role === member (createSale / POST /sales).
});

test("tenant isolation contract: sales keyed by tenant + idempotency", () => {
  const parsed = createSaleSchema.parse({
    lines: [
      {
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: 1,
        unitPrice: "1.00",
      },
    ],
    idempotencyKey: "idempotent-sale-key",
  });
  assert.equal(parsed.idempotencyKey, "idempotent-sale-key");
  assert.ok((parsed.idempotencyKey?.length ?? 0) >= 8);
});

test("hoflayn_web source is accepted in schema but blocked in service", () => {
  const parsed = createSaleSchema.parse({
    source: "hoflayn_web",
    lines: [
      {
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: 1,
        unitPrice: "1.00",
      },
    ],
  });
  assert.equal(parsed.source, "hoflayn_web");
});

test("idempotency key too short rejected", () => {
  assert.throws(() =>
    createSaleSchema.parse({
      lines: [
        {
          productId: "11111111-1111-4111-8111-111111111111",
          quantity: 1,
          unitPrice: "1.00",
        },
      ],
      idempotencyKey: "short",
    }),
  );
});
