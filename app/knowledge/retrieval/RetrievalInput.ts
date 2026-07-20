/**
 * Input for a single {@link VectorRetriever} retrieval request.
 *
 * All three fields are required and workspace-scoped: `workspaceId` bounds
 * which vectors/chunks are eligible, `query` is the raw text to embed and
 * search with, and `limit` caps how many ranked chunks come back.
 */
export interface RetrievalInput {
  workspaceId: string;
  query: string;
  limit: number;
}
