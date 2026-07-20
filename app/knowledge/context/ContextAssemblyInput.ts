import type { RetrievedChunk } from "../retrieval/RetrievalResult";

/**
 * Input for a single {@link ContextAssembler} request.
 *
 * `chunks` is expected to already be ranked (best match first) — typically
 * the `chunks` of a `HybridSearch`/`VectorRetriever` `RetrievalResult` —
 * since `ContextAssembler` preserves whatever order it is given rather
 * than re-sorting. `workspaceId` bounds which documents may be hydrated
 * for provenance, `query` is carried through unchanged for the resulting
 * `GroundingContext`, and `maxCharacters` caps the total length of the
 * assembled, rendered `content`.
 */
export interface ContextAssemblyInput {
  workspaceId: string;
  query: string;
  chunks: RetrievedChunk[];
  maxCharacters: number;
}
