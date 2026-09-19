import {
  type TextGenerateInput,
  type TextGenerateResult,
  type TextProvider,
  ProviderError,
} from "../types";

/**
 * OpenAI Chat Completions adapter (HTTP, no SDK).
 * Construct only when OPENAI_API_TOKEN / OPENAI_API_KEY is set.
 */
export class OpenAiTextProvider implements TextProvider {
  readonly id = "openai";
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini",
  ) {
    if (!apiKey) {
      throw new ProviderError("openai", "OPENAI_API_KEY is not set", false);
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateText(input: TextGenerateInput): Promise<TextGenerateResult> {
    try {
      const configuredTimeout = Number(
        process.env.OPENAI_TIMEOUT_MS ?? 45_000,
      );
      const timeoutMs = Number.isFinite(configuredTimeout)
        ? Math.max(5_000, Math.min(configuredTimeout, 120_000))
        : 45_000;
      const jobId =
        typeof input.options?.jobId === "string"
          ? input.options.jobId
          : undefined;
      const userContent = input.imageUrl
        ? [
            { type: "text" as const, text: input.prompt },
            {
              type: "image_url" as const,
              image_url: { url: input.imageUrl, detail: "low" as const },
            },
          ]
        : input.prompt;
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(jobId ? { "Idempotency-Key": `hoflayn-${jobId}` } : {}),
        },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          model: this.model,
          temperature:
            input.options?.operation === "analyze_product_image" ? 0.3 : 0.7,
          response_format: { type: "json_object" },
          messages: [
            ...(input.system
              ? [{ role: "system" as const, content: input.system }]
              : []),
            { role: "user" as const, content: userContent },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new ProviderError(
          this.id,
          `OpenAI failed (${res.status}): ${body.slice(0, 500)}`,
          res.status === 429 || res.status >= 500,
        );
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error("OpenAI returned empty content");
      }

      const promptTokens = data.usage?.prompt_tokens ?? 0;
      const completionTokens = data.usage?.completion_tokens ?? 0;
      // Rough gpt-4o-mini estimate; refined later via usage dashboards.
      const costUsd =
        (promptTokens / 1_000_000) * 0.15 +
        (completionTokens / 1_000_000) * 0.6;

      return {
        text,
        costUsd,
        model: this.model,
        raw: { usage: data.usage },
      };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new ProviderError("openai", message, true);
    }
  }
}
