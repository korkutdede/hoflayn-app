import { MockImageProvider } from "./providers/mock";
import { ReplicateImageProvider } from "./providers/replicate";
import { MockTextProvider } from "./providers/mock-text";
import { OpenAiTextProvider } from "./providers/openai";
import {
  CircuitOpenError,
  type ImageOperation,
  type ImageProcessInput,
  type ImageProcessResult,
  type ImageProvider,
  type TextGenerateInput,
  type TextGenerateResult,
  type TextProvider,
  ProviderError,
} from "./types";
import {
  isCircuitOpen,
  recordFailure,
  recordSuccess,
} from "./circuit-breaker";

/**
 * Resolves the preferred image provider.
 * Prefer Replicate when token is present; otherwise mock (dev / no env).
 */
export function getImageProvider(): ImageProvider {
  if (process.env.REPLICATE_API_TOKEN) {
    return new ReplicateImageProvider();
  }
  if (mockAiAllowed()) return new MockImageProvider();
  throw new ProviderError(
    "replicate",
    "REPLICATE_API_TOKEN is required in production",
    false,
  );
}

export function getTextProvider(): TextProvider {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAiTextProvider();
  }
  if (mockAiAllowed()) return new MockTextProvider();
  throw new ProviderError(
    "openai",
    "OPENAI_API_KEY is required in production",
    false,
  );
}

export function mockAiAllowed() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_MOCK_AI === "true"
  );
}

export function shouldForceMockProvider(providerConfigured: boolean) {
  return !providerConfigured && mockAiAllowed();
}

/**
 * Runs an image operation through the registry with circuit-breaker guards.
 */
export async function runImageOperation(
  input: ImageProcessInput,
  provider: ImageProvider = getImageProvider(),
): Promise<ImageProcessResult & { providerId: string }> {
  if (!provider.supports(input.operation)) {
    throw new ProviderError(
      provider.id,
      `Operation not supported: ${input.operation}`,
      false,
    );
  }

  if (isCircuitOpen(provider.id)) {
    throw new CircuitOpenError(provider.id);
  }

  try {
    const result = await provider.processImage(input);
    recordSuccess(provider.id);
    return { ...result, providerId: provider.id };
  } catch (err) {
    recordFailure(provider.id);
    throw err;
  }
}

export async function runTextOperation(
  input: TextGenerateInput,
  provider: TextProvider = getTextProvider(),
): Promise<TextGenerateResult & { providerId: string }> {
  if (isCircuitOpen(provider.id)) {
    throw new CircuitOpenError(provider.id);
  }

  try {
    const result = await provider.generateText(input);
    recordSuccess(provider.id);
    return { ...result, providerId: provider.id };
  } catch (err) {
    recordFailure(provider.id);
    throw err;
  }
}

export function listSupportedOperations(
  provider: ImageProvider = getImageProvider(),
): ImageOperation[] {
  return (["remove_bg", "white_bg"] as ImageOperation[]).filter((op) =>
    provider.supports(op),
  );
}
