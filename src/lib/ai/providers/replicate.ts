import {
  type ImageOperation,
  type ImageProcessInput,
  type ImageProcessResult,
  type ImageProvider,
  ProviderError,
} from "../types";

/**
 * Replicate adapter for background removal.
 *
 * Uses the HTTP API directly (no SDK) so the dependency surface stays small.
 * When REPLICATE_API_TOKEN is missing, the registry falls back to mock —
 * this class should only be constructed when a token exists.
 *
 * Model: cjwbw/rembg (common rembg wrapper on Replicate). Override with
 * REPLICATE_REMBG_MODEL if needed.
 */
const DEFAULT_MODEL =
  process.env.REPLICATE_REMBG_MODEL ??
  "cjwbw/rembg:e4a3d3d3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3";

/** Prefer a well-known rembg version slug; override via env. */
const REMBG_VERSION =
  process.env.REPLICATE_REMBG_VERSION ??
  "fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003";

export class ReplicateImageProvider implements ImageProvider {
  readonly id = "replicate";
  private readonly token: string;

  constructor(token = process.env.REPLICATE_API_TOKEN) {
    if (!token) {
      throw new ProviderError(
        "replicate",
        "REPLICATE_API_TOKEN is not set",
        false,
      );
    }
    this.token = token;
  }

  supports(operation: ImageOperation): boolean {
    return operation === "remove_bg" || operation === "white_bg";
  }

  async processImage(input: ImageProcessInput): Promise<ImageProcessResult> {
    const started = Date.now();
    try {
      const jobId =
        typeof input.options?.jobId === "string"
          ? input.options.jobId
          : undefined;
      const checkpoint =
        typeof input.options?.predictionId === "string"
          ? input.options.predictionId
          : undefined;
      const prediction = checkpoint
        ? { id: checkpoint }
        : await this.createPrediction(input.imageUrl, jobId);
      const onPredictionCreated = input.options?.onPredictionCreated;
      if (!checkpoint && typeof onPredictionCreated === "function") {
        await onPredictionCreated(prediction.id);
      }
      const outputUrl = await this.waitForPrediction(prediction.id);
      const costUsd = 0.0036; // published rembg estimate; calibrate with usage data

      // white_bg: for now return the cutout; Stage 3 composites onto white.
      return {
        imageUrl: outputUrl,
        costUsd,
        model: process.env.REPLICATE_REMBG_VERSION
          ? `replicate/rembg:${REMBG_VERSION.slice(0, 8)}`
          : `replicate/rembg`,
        raw: {
          predictionId: prediction.id,
          operation: input.operation,
          latencyHintMs: Date.now() - started,
          modelHint: DEFAULT_MODEL,
        },
      };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new ProviderError("replicate", message, true);
    }
  }

  private async createPrediction(
    imageUrl: string,
    jobId?: string,
  ): Promise<{ id: string }> {
    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${this.token}`,
        "Content-Type": "application/json",
        "Cancel-After": "90s",
        ...(jobId ? { "Idempotency-Key": `hoflayn-${jobId}` } : {}),
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        version: REMBG_VERSION,
        input: { image: imageUrl },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 402) {
        throw new ProviderError(
          this.id,
          "The Replicate account is out of balance. Top it up at replicate.com/account/billing; no Hoflayn credits were charged.",
          false,
        );
      }
      throw new ProviderError(
        this.id,
        `Replicate create failed (${res.status}): ${body.slice(0, 500)}`,
        res.status === 429 || res.status >= 500,
      );
    }

    return (await res.json()) as { id: string };
  }

  private async waitForPrediction(id: string): Promise<string> {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const res = await fetch(
        `https://api.replicate.com/v1/predictions/${id}`,
        {
          headers: { Authorization: `Token ${this.token}` },
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        throw new ProviderError(
          this.id,
          `Replicate poll failed (${res.status}): ${body.slice(0, 500)}`,
          res.status === 429 || res.status >= 500,
        );
      }
      const data = (await res.json()) as {
        status: string;
        output?: string | string[];
        error?: string;
      };
      if (data.status === "succeeded") {
        const out = data.output;
        const url = Array.isArray(out) ? out[0] : out;
        if (!url || typeof url !== "string") {
          throw new Error("Replicate succeeded but returned no image URL");
        }
        return url;
      }
      if (data.status === "failed" || data.status === "canceled") {
        throw new Error(data.error ?? `Prediction ${data.status}`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error("Replicate prediction timed out");
  }
}
