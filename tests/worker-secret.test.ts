import assert from "node:assert/strict";
import test from "node:test";
import { verifyBearerSecret } from "../src/lib/security/secrets";

test("worker bearer verification fails closed", () => {
  assert.equal(verifyBearerSecret(null, "configured"), false);
  assert.equal(verifyBearerSecret("Bearer configured", undefined), false);
  assert.equal(verifyBearerSecret("Basic configured", "configured"), false);
  assert.equal(verifyBearerSecret("Bearer wrong", "configured"), false);
});

test("worker bearer verification accepts exact secret", () => {
  assert.equal(
    verifyBearerSecret("Bearer a-long-random-secret", "a-long-random-secret"),
    true,
  );
});
