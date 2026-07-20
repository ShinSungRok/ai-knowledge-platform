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
] as const;
