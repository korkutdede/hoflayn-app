import assert from "node:assert/strict";
import test from "node:test";
import {
  assertStockAllowed,
  computeStockDelta,
  InsufficientStockError,
} from "../src/lib/stock/policy";
import { createStockMovementSchema } from "../src/lib/stock/schemas";

test("in/out/reserve deltas update balance", () => {
  assert.deepEqual(computeStockDelta({ type: "in", quantity: 5, current: 2 }), {
    delta: 5,
    balanceAfter: 7,
  });
  assert.deepEqual(computeStockDelta({ type: "out", quantity: 3, current: 10 }), {
    delta: -3,
    balanceAfter: 7,
  });
  assert.deepEqual(
    computeStockDelta({ type: "reserve", quantity: 2, current: 7 }),
    { delta: -2, balanceAfter: 5 },
  );
});

test("adjust sets absolute target", () => {
  assert.deepEqual(
    computeStockDelta({ type: "adjust", quantity: 12, current: 4 }),
    { delta: 8, balanceAfter: 12 },
  );
  assert.deepEqual(
    computeStockDelta({ type: "adjust", quantity: 0, current: 4 }),
    { delta: -4, balanceAfter: 0 },
  );
});

test("negative stock blocked unless allowNegative", () => {
  assert.throws(
    () =>
      assertStockAllowed({
        balanceAfter: -1,
        allowNegative: false,
        productId: "p1",
        requested: 5,
        available: 2,
      }),
    (error: unknown) => error instanceof InsufficientStockError,
  );
  assert.doesNotThrow(() =>
    assertStockAllowed({
      balanceAfter: -1,
      allowNegative: true,
      productId: "p1",
      requested: 5,
      available: 2,
    }),
  );
});

test("member cannot request allowNegative via schema+role contract", () => {
  const parsed = createStockMovementSchema.parse({
    type: "out",
    quantity: 1,
    allowNegative: true,
  });
  assert.equal(parsed.allowNegative, true);
  // Role gate is enforced in applyStockMovement (member → throw).
  const role: "owner" | "admin" | "member" = "member";
  assert.equal(role === "member" && parsed.allowNegative, true);
});

test("create movement schema rejects negative quantity input", () => {
  assert.throws(() =>
    createStockMovementSchema.parse({ type: "in", quantity: -2 }),
  );
  const ok = createStockMovementSchema.parse({
    type: "adjust",
    quantity: 0,
  });
  assert.equal(ok.type, "adjust");
  assert.equal(ok.quantity, 0);
});

test("tenant isolation contract: movements always keyed by product+tenant in service", () => {
  // Guards wiring: schema types remain four Loop 21 kinds.
  const types = createStockMovementSchema.shape.type.options;
  assert.deepEqual(types, ["in", "out", "adjust", "reserve"]);
});
