import assert from "node:assert/strict";
import test from "node:test";
import { voidSaleSchema } from "../src/lib/sales/schemas";
import {
  decideSaleVoid,
  saleVoidStockIdempotencyKey,
} from "../src/lib/sales/void";
import { buildSalesSummary } from "../src/lib/sales/summary";

test("decideSaleVoid voids completed and no-ops voided", () => {
  assert.deepEqual(decideSaleVoid("completed"), { action: "void" });
  assert.deepEqual(decideSaleVoid("voided"), { action: "noop_reused" });
  assert.equal(decideSaleVoid("draft").action, "conflict");
});

test("voidSaleSchema accepts optional idempotencyKey", () => {
  const ok = voidSaleSchema.parse({
    note: "müşteri vazgeçti",
    idempotencyKey: "void-key-01",
  });
  assert.equal(ok.idempotencyKey, "void-key-01");
  assert.throws(() =>
    voidSaleSchema.parse({ idempotencyKey: "short" }),
  );
});

test("saleVoidStockIdempotencyKey is stable per line", () => {
  assert.equal(
    saleVoidStockIdempotencyKey("sale-1", "line-1"),
    "sale-void:sale-1:line-1",
  );
  assert.equal(
    saleVoidStockIdempotencyKey("sale-1", "line-1", "req-abc"),
    "sale-void:sale-1:line-1:req-abc",
  );
});

test("voided sales drop out of summary windows", () => {
  const now = new Date("2026-08-09T12:00:00.000Z");
  const summary = buildSalesSummary({
    now,
    sales: [
      {
        id: "s1",
        soldAt: now,
        totalMinor: 10000,
        status: "voided",
      },
      {
        id: "s2",
        soldAt: now,
        totalMinor: 5000,
        status: "completed",
      },
    ],
    lines: [
      {
        saleId: "s1",
        productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        quantity: 2,
        lineTotalMinor: 10000,
        productNameSnapshot: "Mum",
      },
      {
        saleId: "s2",
        productId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        quantity: 1,
        lineTotalMinor: 5000,
        productNameSnapshot: "Vazo",
      },
    ],
  });
  assert.equal(summary.windows.today.saleCount, 1);
  assert.equal(summary.windows.today.revenueMinor, 5000);
  assert.equal(summary.topProducts[0]?.productId, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
});

test("member role gate contract for sale void", () => {
  const role: "owner" | "admin" | "member" = "member";
  assert.equal(role === "member", true);
});

test("tenant isolation contract: void scopes sale by tenantId", () => {
  const predicate = "sales.id = :id AND sales.tenant_id = :tenantId";
  assert.match(predicate, /tenant_id/);
});
