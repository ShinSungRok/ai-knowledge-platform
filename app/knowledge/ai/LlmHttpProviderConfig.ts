/**
 * Configuration for an OpenAI-compatible HTTP {@link LanguageModelProvider}.
 *
 * `baseUrl` is the API root (e.g. `https://api.openai.com/v1`).
 * Optional `timeoutMs` is a positive integer when present.
 * Optional `temperature` is a finite number in `[0, 2]` when present —
 * omitted entirely from the request body when absent, letting the
 * provider's own default apply.
 */
export type LlmHttpProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  temperature?: number;
};
