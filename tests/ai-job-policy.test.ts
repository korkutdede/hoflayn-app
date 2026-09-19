import assert from "node:assert/strict";
import test from "node:test";
import {
  retryDelayMs,
  shouldRetryJob,
} from "../src/lib/ai/jobs/policy";
import {
  CircuitOpenError,
  ProviderError,
} from "../src/lib/ai/types";

test("retry delay applies capped exponential backoff", () => {
  assert.equal(retryDelayMs(1), 30_000);
  assert.equal(retryDelayMs(2), 60_000);
  assert.equal(retryDelayMs(3), 120_000);
  assert.equal(retryDelayMs(20), 900_000);
});

test("retry policy only retries transient provider failures before max", () => {
  assert.equal(
    shouldRetryJob(new ProviderError("test", "temporary", true), 1, 3),
    true,
  );
  assert.equal(
    shouldRetryJob(new ProviderError("test", "invalid key", false), 1, 3),
    false,
  );
  assert.equal(shouldRetryJob(new CircuitOpenError("test"), 2, 3), true);
  assert.equal(
    shouldRetryJob(new ProviderError("test", "temporary", true), 3, 3),
    false,
  );
  assert.equal(shouldRetryJob(new Error("application error"), 1, 3), false);
});
