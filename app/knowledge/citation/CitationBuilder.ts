import type { GroundedAnswer } from "../rag/GroundedAnswer";
import type { Citation } from "./Citation";

/**
 * Port for converting a {@link GroundedAnswer}'s evidence into a
 * deterministic list of {@link Citation}s.
 *
 * This is where the **evidence-only citation policy** lives: every
 * citation must correspond to exactly one entry on `answer.evidence`,
 * and an empty evidence list must produce an empty citation list —
 * never a fabricated citation. Concrete adapters live under
 * `app/knowledge/citation` and are wired only at the composition root;
 * no adapter may call an LLM provider, rewrite answer text, look up
 * document titles, or retrieve/re-rank context — it only maps the
 * evidence it is given.
 */
export interface CitationBuilder {
  build(answer: GroundedAnswer): Promise<Citation[]>;
}
