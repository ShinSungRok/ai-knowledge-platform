/**
 * Unit-level cases for DefaultVectorRetriever.
 *
 * Executed via:
 *
 *   pnpm validate:retrieval:vector
 *
 * Covered behaviors:
 * - implements the VectorRetriever port contract
 * - retrieve embeds the query via EmbeddingProvider, ranks via
 *   VectorIndex.findNearest, and hydrates each result to its DocumentChunk
 *   via DocumentChunkRepository.findById, preserving VectorIndex's ranking
 *   order
 * - retrieve only resolves chunks/vectors within the requested workspaceId
 * - retrieve silently excludes a stale vector (chunk no longer exists)
 *   instead of failing the whole request
 * - retrieve returns at most limit chunks
 * - retrieve rejects an empty/whitespace workspaceId or query, a
 *   non-positive or non-integer limit, and a non-object input
 * - DefaultVectorRetriever's source never references a concrete adapter
 *   (FakeEmbeddingProvider, InMemoryVectorIndex,
 *   DefaultInMemoryDocumentChunkRepository, or the persistence module)
 */
export const DEFAULT_VECTOR_RETRIEVER_UNIT_CASES = [
  "implements_VectorRetriever_port",
  "retrieve_embeds_query_and_hydrates_nearest_chunks",
  "retrieve_isolates_by_workspace",
  "retrieve_skips_stale_vectors_without_failing",
  "retrieve_respects_limit",
  "rejects_invalid_workspaceId_query_limit_input",
  "imports_only_ports_never_concrete_adapter",
] as const;
