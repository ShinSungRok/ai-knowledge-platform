/**
 * Unit-level cases for EmbedDocumentChunksPipeline.
 *
 * Executed via:
 *
 *   pnpm validate:pipeline:embed-document
 *
 * Covered behaviors:
 * - a document with no chunks succeeds with a zero-count result, without
 *   calling the embedding provider or the vector index
 * - embeds every chunk (ordered via findByDocumentId) and stores one
 *   vector per chunk, each carrying the chunk's own workspaceId/id
 * - vectors are isolated per workspace for the same chunkId
 * - an invalid provider result (wrong dimension or a non-finite value) is
 *   rejected before any vector index write — no partial writes, even when
 *   earlier chunks in the same run produced valid vectors
 * - re-running against the same document replaces vectors rather than
 *   duplicating them (stable per-chunk identity)
 * - rejects invalid input (missing workspaceId/documentId, non-object)
 */
export const EMBED_DOCUMENT_CHUNKS_PIPELINE_UNIT_CASES = [
  "empty_chunks_returns_zero_without_side_effects",
  "embeds_each_chunk_and_stores_vector",
  "workspace_isolation",
  "invalid_provider_result_rejected_before_any_write",
  "rerun_replaces_rather_than_duplicates",
  "rejects_invalid_input",
] as const;
