import type { GroundingContext } from "../context/GroundingContext";
import type { GroundedPrompt } from "./GroundedPrompt";

/**
 * Port for turning a {@link GroundingContext} into an LLM-independent
 * {@link GroundedPrompt}.
 *
 * Reuses the context module's own `GroundingContext` shape — a
 * `PromptBuilder` never re-retrieves, re-ranks, or re-assembles context,
 * it only renders the context it is given. Concrete adapters live under
 * `app/knowledge/prompt` and are wired only at the composition root; no
 * adapter may call or construct an LLM provider — that consumes a
 * `GroundedPrompt`, it is never produced from inside one.
 */
export interface PromptBuilder {
  build(context: GroundingContext): Promise<GroundedPrompt>;
}
