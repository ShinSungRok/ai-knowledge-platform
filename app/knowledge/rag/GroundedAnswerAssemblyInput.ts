import type { GroundingContext } from "../context/GroundingContext";
import type { GeneratedText } from "../ai/GeneratedText";

/**
 * Input for a single {@link GroundedAnswerAssembler} request: the
 * grounding context an answer must be evidence-bound to, and the plain
 * text a {@link LanguageModelProvider} generated for it.
 *
 * Reuses the context and ai modules' own `GroundingContext`/
 * `GeneratedText` shapes as-is — assembly never re-retrieves,
 * re-ranks, re-assembles context, or re-invokes a provider.
 */
export interface GroundedAnswerAssemblyInput {
  context: GroundingContext;
  generatedText: GeneratedText;
}
