import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { FetchEmbeddingHttpTransport } from "../embedding/FetchEmbeddingHttpTransport";
import type { EmbeddingHttpProviderConfig } from "../embedding/EmbeddingHttpProviderConfig";
import type { EmbeddingHttpTransport } from "../embedding/EmbeddingHttpTransport";
import type { EmbeddingProvider } from "../embedding/EmbeddingProvider";
import { HttpEmbeddingProvider } from "../embedding/HttpEmbeddingProvider";

/**
 * Optional embedding provider selection for composition roots.
 * Default is Fake. HTTP uses {@link HttpEmbeddingProvider} — OpenAI or any
 * OpenAI-compatible endpoint (including a local Ollama instance); when
 * `transport` is omitted, {@link FetchEmbeddingHttpTransport} is used.
 */
export type EmbeddingProviderOption =
  | { type: "fake" }
  | {
      type: "http";
      config: EmbeddingHttpProviderConfig;
      transport?: EmbeddingHttpTransport;
    };

export function createEmbeddingProvider(
  option: EmbeddingProviderOption = { type: "fake" },
): EmbeddingProvider {
  if (option.type === "fake") {
    return new FakeEmbeddingProvider();
  }
  const transport = option.transport ?? new FetchEmbeddingHttpTransport();
  return new HttpEmbeddingProvider(option.config, transport);
}
