/**
 * Module: `app/knowledge/rag`
 *
 * RAG answer assembly (answer + citations).
 *
 * `GroundedAnswer` (Task 44) explicitly combines generated text with
 * the grounding evidence it is backed by (`text`, `evidence:
 * GroundingContextBlock[]`, `insufficientEvidence`);
 * `GroundedAnswerAssemblyInput` (`context`, `generatedText`) is the
 * input a `GroundedAnswerAssembler` port turns into one. This is where
 * insufficient-evidence policy lives — never in `PromptBuilder` or
 * `LanguageModelProvider`. `DefaultGroundedAnswerAssembler` (Task 45) is
 * its default adapter: no constructor dependency at all, discarding any
 * given generated text whenever the context carried no evidence.
 */
export const KNOWLEDGE_MODULE_RAG = "app/knowledge/rag" as const;

export type { GroundedAnswer } from "./GroundedAnswer";
export type { GroundedAnswerAssemblyInput } from "./GroundedAnswerAssemblyInput";
export type { GroundedAnswerAssembler } from "./GroundedAnswerAssembler";
export { DefaultGroundedAnswerAssembler } from "./DefaultGroundedAnswerAssembler";
