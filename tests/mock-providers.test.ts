import assert from "node:assert/strict";
import test from "node:test";
import { MockImageProvider } from "../src/lib/ai/providers/mock";
import { MockTextProvider } from "../src/lib/ai/providers/mock-text";

test("mock image provider returns a processable PNG", async () => {
  const result = await new MockImageProvider().processImage({
    imageUrl: "https://example.com/product.jpg",
    operation: "remove_bg",
  });
  assert.match(result.imageUrl, /^data:image\/png;base64,/);
  assert.equal(result.costUsd, 0);
});

test("mock text provider covers all writer text operations", async () => {
  const provider = new MockTextProvider();
  for (const operation of [
    "analyze_product_image",
    "generate_description",
    "generate_caption",
    "analyze_seo",
  ]) {
    const result = await provider.generateText({
      prompt: "test",
      options: { operation },
    });
    assert.doesNotThrow(() => JSON.parse(result.text));
    assert.equal(result.costUsd, 0);
  }
});
