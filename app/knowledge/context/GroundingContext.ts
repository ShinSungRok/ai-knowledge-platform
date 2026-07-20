/**
 * A single grounding context block hydrated from one retrieved
 * {@link DocumentChunk}, preserving the provenance chain a downstream
 * Prompt Builder / Citation capability needs to attribute an answer back
 * to its source.
 *
 * `sourceId` and `documentId` trace back to the `KnowledgeSource` and
 * `KnowledgeDocument` the chunk was hydrated from; `chunkId` is the
 * chunk's own workspace-global identity; `score` is the retrieval score
 * the chunk was ranked with (unchanged from `RetrievedChunk.score`); `text`
 * is the chunk's own text, never truncated or rewritten by assembly.
 */
export interface GroundingContextBlock {
  sourceId: string;
  documentId: string;
  chunkId: string;
  score: number;
  text: string;
}

/**
 * Result of a single {@link ContextAssembler} request: a bounded,
 * deterministic grounding context ready for a downstream Prompt Builder /
 * Citation capability.
 *
 * `blocks` preserves the ranking order of the `ContextAssemblyInput.chunks`
 * that were actually included — assembly never re-sorts. `content` is the
 * rendered concatenation of those same blocks, capped at
 * `ContextAssemblyInput.maxCharacters`. `truncated` is `true` whenever at
 * least one candidate block could not be included (whether for exceeding
 * the remaining character budget or for referencing a document that no
 * longer exists), so callers can distinguish "used everything relevant"
 * from "some context was left out."
 */
export interface GroundingContext {
  query: string;
  blocks: GroundingContextBlock[];
  content: string;
  truncated: boolean;
}
