/**
 * Module: `app/knowledge/prompt`
 *
 * Prompt construction from a `GroundingContext`.
 *
 * `GroundedPrompt` (Task 38) is an LLM-independent prompt representation
 * (`systemInstruction`, `userMessage`); `PromptBuilder` is the port that
 * builds one from a `GroundingContext`. `DefaultPromptBuilder` (Task 39)
 * is its default adapter: a fixed-format, evidence-bound renderer with
 * no constructor dependency at all, never calling or constructing an
 * LLM provider.
 */
export const KNOWLEDGE_MODULE_PROMPT = "app/knowledge/prompt" as const;

export type { GroundedPrompt } from "./GroundedPrompt";
export type { PromptBuilder } from "./PromptBuilder";
export { DefaultPromptBuilder } from "./DefaultPromptBuilder";
