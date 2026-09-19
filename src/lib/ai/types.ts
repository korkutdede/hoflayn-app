/** Shared AI provider contracts (P4). Modules never import provider SDKs. */

export type ImageOperation = "remove_bg" | "white_bg";

export type ImageProcessInput = {
  /** Public or signed URL of the source image. */
  imageUrl: string;
  operation: ImageOperation;
  /** Optional hints (scene id, prompt, etc.). */
  options?: Record<string, unknown>;
};

export type ImageProcessResult = {
  /** Result image URL (remote or data URL for mock). */
  imageUrl: string;
  width?: number;
  height?: number;
  /** Provider-reported or estimated USD cost for this call. */
  costUsd: number;
  model: string;
  raw?: Record<string, unknown>;
};

export interface ImageProvider {
  readonly id: string;
  supports(operation: ImageOperation): boolean;
  processImage(input: ImageProcessInput): Promise<ImageProcessResult>;
}

export type TextGenerateInput = {
  prompt: string;
  system?: string;
  /** Optional image for multimodal text generation. */
  imageUrl?: string;
  options?: Record<string, unknown>;
};

export type TextGenerateResult = {
  text: string;
  costUsd: number;
  model: string;
  raw?: Record<string, unknown>;
};

export interface TextProvider {
  readonly id: string;
  generateText(input: TextGenerateInput): Promise<TextGenerateResult>;
}

export class ProviderError extends Error {
  readonly code = "PROVIDER_ERROR" as const;
  constructor(
    public readonly providerId: string,
    message: string,
    public readonly retryable = true,
  ) {
    super(`[${providerId}] ${message}`);
    this.name = "ProviderError";
  }
}

export class CircuitOpenError extends Error {
  readonly code = "CIRCUIT_OPEN" as const;
  constructor(public readonly providerId: string) {
    super(`Circuit open for provider: ${providerId}`);
    this.name = "CircuitOpenError";
  }
}
