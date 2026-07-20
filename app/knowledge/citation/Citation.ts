/**
 * A single citation derived from one {@link GroundingContextBlock} on a
 * {@link GroundedAnswer}'s evidence list.
 *
 * `id` is a deterministic, evidence-bound identifier (never fabricated
 * from answer text or an LLM extraction). `sourceId`, `documentId`,
 * `chunkId`, and `score` are copied from that evidence block's own
 * provenance; `excerpt` is the block's own `text`, never truncated or
 * rewritten by citation construction. A {@link CitationBuilder} must
 * never emit a citation for a block that is not on the given answer's
 * evidence list.
 */
export interface Citation {
  id: string;
  sourceId: string;
  documentId: string;
  chunkId: string;
  score: number;
  excerpt: string;
}
