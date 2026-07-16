/**
 * Unit-level cases for RechunkKnowledgeSourcePipeline.
 *
 * Executed via:
 *
 *   pnpm validate:pipeline:rechunk-source
 *
 * Covered behaviors:
 * - rejects a missing source without listing documents or touching chunk
 *   storage
 * - rejects a source registered only in a different workspace, with the
 *   same no-side-effect guarantee
 * - processes only the target source's documents, delegating each to
 *   ChunkKnowledgeDocumentPipeline; other sources' documents/chunks are
 *   never read from or written to
 * - re-running for the same source does not duplicate chunks (stable
 *   savedChunkCount and stored chunk count)
 * - a source with no matching documents succeeds with a zero-count result
 * - rejects invalid input (missing workspaceId/sourceId, non-object)
 */
export const RECHUNK_KNOWLEDGE_SOURCE_PIPELINE_UNIT_CASES = [
  "rejects_missing_source_without_side_effects",
  "rejects_cross_workspace_source_without_side_effects",
  "only_target_source_documents_are_processed",
  "rerun_does_not_duplicate_chunks",
  "empty_source_succeeds_with_zero_count",
  "rejects_invalid_input",
] as const;
