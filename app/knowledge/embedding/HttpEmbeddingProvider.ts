import type { EmbeddingHttpProviderConfig } from "./EmbeddingHttpProviderConfig";
import type { EmbeddingHttpTransport } from "./EmbeddingHttpTransport";
import type { EmbeddingProvider } from "./EmbeddingProvider";

/**
 * OpenAI-compatible {@link EmbeddingProvider} over {@link
 * EmbeddingHttpTransport}. Also works against a local Ollama instance
 * (`baseUrl` pointed at its OpenAI-compatible `/v1` root) — same request
 * shape, no code branch needed.
 *
 * Performs no chunking, caching, or retrieval — it only turns one string
 * into one vector. All HTTP goes through the injected transport.
 */
export class HttpEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly config: EmbeddingHttpProviderConfig,
    private readonly transport: EmbeddingHttpTransport,
  ) {}

  async embed(text: string): Promise<number[]> {
    const validated = this.toText(text);
    const baseUrl = this.config.baseUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/embeddings`;
    const body = JSON.stringify({
      model: this.config.model,
      input: validated,
      ...(this.config.dimensions !== undefined
        ? { dimensions: this.config.dimensions }
        : {}),
    });

    const response = await this.transport.fetch({
      url,
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        "content-type": "application/json",
      },
      body,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Embedding HTTP request failed: ${response.status}`);
    }

    return this.extractEmbedding(response.bodyText);
  }

  private toText(text: string): string {
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new Error(
        "EmbeddingProvider.embed text must be a non-empty, non-whitespace string",
      );
    }
    return text;
  }

  private extractEmbedding(bodyText: string): number[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      throw new Error("Embedding HTTP response is invalid");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Embedding HTTP response is invalid");
    }
    const data = (parsed as { data?: unknown }).data;
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Embedding HTTP response is invalid");
    }
    const first = data[0];
    if (!first || typeof first !== "object" || Array.isArray(first)) {
      throw new Error("Embedding HTTP response is invalid");
    }
    const embedding = (first as { embedding?: unknown }).embedding;
    if (
      !Array.isArray(embedding) ||
      embedding.length === 0 ||
      !embedding.every((value) => typeof value === "number" && Number.isFinite(value))
    ) {
      throw new Error("Embedding HTTP response is invalid");
    }
    return [...embedding];
  }
}
