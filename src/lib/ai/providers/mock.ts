import {
  type ImageOperation,
  type ImageProcessInput,
  type ImageProcessResult,
  type ImageProvider,
} from "../types";

/**
 * Deterministic mock provider for local/dev when REPLICATE_API_TOKEN is absent.
 * Returns a tiny transparent PNG as a data URL so the pipeline can complete.
 */
const TRANSPARENT_PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export class MockImageProvider implements ImageProvider {
  readonly id = "mock";

  supports(operation: ImageOperation): boolean {
    return operation === "remove_bg" || operation === "white_bg";
  }

  async processImage(input: ImageProcessInput): Promise<ImageProcessResult> {
    // Simulate network latency without making the dashboard feel stuck.
    await new Promise((r) => setTimeout(r, 150));
    return {
      imageUrl: TRANSPARENT_PNG_1X1,
      width: 1,
      height: 1,
      costUsd: 0,
      model: `mock/${input.operation}`,
      raw: { source: input.imageUrl, mock: true },
    };
  }
}
