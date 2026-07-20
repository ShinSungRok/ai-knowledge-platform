import type { GroundedAnswer } from "../rag/GroundedAnswer";
import type { Citation } from "./Citation";

/**
 * A {@link GroundedAnswer} paired with the evidence-bound
 * {@link Citation}s derived from that answer's own evidence list.
 *
 * `citations` is produced solely from `answer.evidence` — never from
 * answer text rewriting, LLM citation extraction, or any source outside
 * the given evidence. An insufficient-evidence answer (empty evidence)
 * therefore carries an empty `citations` array.
 */
export interface CitedGroundedAnswer {
  answer: GroundedAnswer;
  citations: Citation[];
}
