import type { GroundedPrompt } from "../prompt/GroundedPrompt";
import type { GeneratedText } from "./GeneratedText";

/**
 * Port for a provider-independent LLM generation request: turning a
 * {@link GroundedPrompt} into {@link GeneratedText}.
 *
 * `GroundedPrompt` is this port's **only** prompt input — a provider
 * consumes it, it never constructs, rewrites, or re-derives a prompt of
 * its own, and it never re-retrieves, re-ranks, or re-assembles
 * grounding context. Concrete adapters (fake or real) live under
 * `app/knowledge/ai` and are wired only at the composition root. No
 * framework, model SDK, or external provider dependency is implied by
 * this contract itself.
 */
export interface LanguageModelProvider {
  generate(prompt: GroundedPrompt): Promise<GeneratedText>;
}
