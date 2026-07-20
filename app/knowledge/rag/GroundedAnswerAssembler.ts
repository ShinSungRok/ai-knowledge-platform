import type { GroundedAnswerAssemblyInput } from "./GroundedAnswerAssemblyInput";
import type { GroundedAnswer } from "./GroundedAnswer";

/**
 * Port for explicitly combining a {@link GroundedAnswerAssemblyInput}'s
 * generated text and grounding evidence into one {@link GroundedAnswer}.
 *
 * This is where the **insufficient-evidence policy** lives: whether the
 * given generated text is even eligible to be returned as an answer
 * depends solely on whether the given context carried any evidence, and
 * that decision belongs to this port's implementation, never to
 * `PromptBuilder` (prompt construction) or `LanguageModelProvider`
 * (generation). Concrete adapters live under `app/knowledge/rag` and are
 * wired only at the composition root; no adapter may call an LLM
 * provider, build a prompt, or retrieve/re-rank context — it only
 * combines what it is given.
 */
export interface GroundedAnswerAssembler {
  assemble(input: GroundedAnswerAssemblyInput): Promise<GroundedAnswer>;
}
