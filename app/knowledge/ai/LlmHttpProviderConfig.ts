/**
 * Configuration for an OpenAI-compatible HTTP {@link LanguageModelProvider}.
 *
 * `baseUrl` is the API root (e.g. `https://api.openai.com/v1`).
 * Optional `timeoutMs` is a positive integer when present.
 */
export type LlmHttpProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
};
