import assert from "node:assert/strict";
import test from "node:test";
import {
  createBridgeSignature,
  verifyBridgeSignature,
} from "../src/lib/bridge/types";

test("bridge signature accepts an exact recent body", () => {
  const rawBody = JSON.stringify({ productId: "product-1", status: "published" });
  const timestamp = "1787994000";
  const secret = "bridge-signing-secret";
  const signature = createBridgeSignature(rawBody, timestamp, secret);

  assert.ok(signature);
  assert.equal(
    verifyBridgeSignature({
      rawBody,
      timestamp,
      signature,
      secret,
      nowSeconds: 1787994000,
    }),
    true,
  );
});

test("bridge signature rejects tampering and stale requests", () => {
  const rawBody = JSON.stringify({ productId: "product-1" });
  const timestamp = "1787994000";
  const secret = "bridge-signing-secret";
  const signature = createBridgeSignature(rawBody, timestamp, secret);

  assert.ok(signature);
  assert.equal(
    verifyBridgeSignature({
      rawBody: `${rawBody} `,
      timestamp,
      signature,
      secret,
      nowSeconds: 1787994000,
    }),
    false,
  );
  assert.equal(
    verifyBridgeSignature({
      rawBody,
      timestamp,
      signature,
      secret,
      nowSeconds: 1787994000 + 301,
    }),
    false,
  );
});
