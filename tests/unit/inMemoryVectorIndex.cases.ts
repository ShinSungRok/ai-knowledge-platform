/**
 * Unit-level cases for InMemoryVectorIndex.
 *
 * Executed via:
 *
 *   pnpm validate:embedding:index
 *
 * Covered behaviors:
 * - implements the VectorIndex port contract
 * - upsert + findByChunkId round trip
 * - findByChunkId returns null for a missing chunkId
 * - upsert replaces the existing vector for the same (workspaceId,
 *   chunkId) identity, never accumulating
 * - the same chunkId is isolated per workspace
 * - defensive copy on both upsert input and findByChunkId output
 * - rejects an empty workspaceId/chunkId
 * - rejects a vector whose length is not EMBEDDING_VECTOR_DIMENSION, or
 *   whose entries are not all finite numbers
 * - findNearest ranks candidates by cosine similarity to queryVector,
 *   best-first
 * - findNearest only ranks vectors within the same workspaceId, and
 *   returns an empty array for a workspace with no vectors
 * - findNearest breaks equal-score ties by chunkId ascending
 * - findNearest scores a zero-norm query or candidate vector as 0
 * - findNearest truncates results to at most limit
 * - findNearest returns defensive copies of both the vector and score
 * - findNearest rejects an invalid workspaceId, a queryVector of the
 *   wrong dimension/shape or with non-finite entries, and a non-positive
 *   or non-integer limit
 */
export const IN_MEMORY_VECTOR_INDEX_UNIT_CASES = [
  "implements_VectorIndex_port",
  "upsert_and_find_round_trip",
  "find_missing_returns_null",
  "upsert_replaces_existing_vector",
  "workspace_isolation",
  "defensive_copy_on_input_and_output",
  "rejects_empty_workspace_id_or_chunk_id",
  "rejects_wrong_dimension_or_non_finite_vector",
  "find_nearest_ranks_by_cosine_similarity_descending",
  "find_nearest_isolates_by_workspace",
  "find_nearest_breaks_ties_by_chunk_id_ascending",
  "find_nearest_treats_zero_norm_as_zero_score",
  "find_nearest_respects_limit",
  "find_nearest_returns_defensive_copies",
  "find_nearest_rejects_invalid_query_vector_or_limit",
] as const;
