/**
 * Module: `app/knowledge/ai`
 *
 * AI provider abstraction (fake + real providers).
 *
 * `GeneratedText` (Task 41) is the plain output of an LLM generation
 * call (`text: string`, not yet a grounded answer or citation);
 * `LanguageModelProvider` is the port that produces one from a
 * `GroundedPrompt` — its only prompt input. A default (fake) adapter is
 * a later task.
 */
export const KNOWLEDGE_MODULE_AI = "app/knowledge/ai" as const;

export type { GeneratedText } from "./GeneratedText";
export type { LanguageModelProvider } from "./LanguageModelProvider";
