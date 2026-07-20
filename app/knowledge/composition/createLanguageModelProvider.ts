import { FakeLanguageModelProvider } from "../ai/FakeLanguageModelProvider";
import { FetchLlmHttpTransport } from "../ai/FetchLlmHttpTransport";
import { HttpLanguageModelProvider } from "../ai/HttpLanguageModelProvider";
import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import type { LlmHttpProviderConfig } from "../ai/LlmHttpProviderConfig";
import type { LlmHttpTransport } from "../ai/LlmHttpTransport";

/**
 * Optional LLM provider selection for composition roots.
 * Default is Fake. HTTP uses {@link HttpLanguageModelProvider}; when
 * `transport` is omitted, {@link FetchLlmHttpTransport} is used.
 */
export type LlmProviderOption =
  | { type: "fake" }
  | {
      type: "http";
      config: LlmHttpProviderConfig;
      transport?: LlmHttpTransport;
    };

export function createLanguageModelProvider(
  option: LlmProviderOption = { type: "fake" },
): LanguageModelProvider {
  if (option.type === "fake") {
    return new FakeLanguageModelProvider();
  }
  const transport = option.transport ?? new FetchLlmHttpTransport();
  return new HttpLanguageModelProvider(option.config, transport);
}
