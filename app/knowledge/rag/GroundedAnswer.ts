import type { GroundingContextBlock } from "../context/GroundingContext";

/**
 * The result of a single {@link GroundedAnswerAssembler} request:
 * generated text explicitly combined with the grounding evidence it is
 * (or is not) backed by.
 *
 * `evidence` is the exact set of {@link GroundingContextBlock}s the
 * answer is grounded in — never re-derived, re-ranked, or re-fetched by
 * assembly. `insufficientEvidence` is `true` whenever `evidence` is
 * empty; in that case `text` is a fixed insufficient-evidence message,
 * **never** the provider's own generated text — deciding this policy is
 * this module's responsibility alone, not `LanguageModelProvider`'s or
 * `PromptBuilder`'s. Citation formatting/identifiers are a later,
 * out-of-scope concern.
 */
export interface GroundedAnswer {
  text: string;
  evidence: GroundingContextBlock[];
  insufficientEvidence: boolean;
}
