/**
 * Module: `app/knowledge/prompt`
 *
 * Prompt construction from a `GroundingContext`.
 *
 * `GroundedPrompt` (Task 38) is an LLM-independent prompt representation
 * (`systemInstruction`, `userMessage`); `PromptBuilder` is the port that
 * builds one from a `GroundingContext`. A default adapter is a later
 * task.
 */
export const KNOWLEDGE_MODULE_PROMPT = "app/knowledge/prompt" as const;

export type { GroundedPrompt } from "./GroundedPrompt";
export type { PromptBuilder } from "./PromptBuilder";
