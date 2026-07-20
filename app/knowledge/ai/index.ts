/**
 * Module: `app/knowledge/ai`
 *
 * AI provider abstraction (fake + real providers).
 *
 * `GeneratedText` is the plain output of an LLM generation call;
 * `LanguageModelProvider` is the port that produces one from a
 * `GroundedPrompt`. `FakeLanguageModelProvider` is a deterministic,
 * dependency-free adapter. `LlmHttpProviderConfig` / `LlmHttpTransport`
 * define an OpenAI-compatible HTTP path without an official SDK.
 * `HttpLanguageModelProvider` implements `LanguageModelProvider` over
 * an injected `LlmHttpTransport` (no direct `fetch` / SDK).
 */
export const KNOWLEDGE_MODULE_AI = "app/knowledge/ai" as const;

export type { GeneratedText } from "./GeneratedText";
export type { LanguageModelProvider } from "./LanguageModelProvider";
export { FakeLanguageModelProvider } from "./FakeLanguageModelProvider";
export { HttpLanguageModelProvider } from "./HttpLanguageModelProvider";
export type { LlmHttpProviderConfig } from "./LlmHttpProviderConfig";
export { loadLlmHttpProviderConfig } from "./loadLlmHttpProviderConfig";
export type { LlmHttpRequest } from "./LlmHttpRequest";
export type { LlmHttpResponse } from "./LlmHttpResponse";
export type { LlmHttpTransport } from "./LlmHttpTransport";
