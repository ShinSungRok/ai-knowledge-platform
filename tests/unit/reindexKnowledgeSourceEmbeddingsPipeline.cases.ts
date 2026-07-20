/**
 * Unit-level cases for ReindexKnowledgeSourceEmbeddingsPipeline.
 *
 * Executed via:
 *
 *   pnpm validate:pipeline:reindex-source
 *
 * Covered behaviors:
 * - rejects a missing source without listing documents or touching the
 *   vector index
 * - rejects a source registered only in a different workspace, with the
 *   same no-side-effect guarantee
 * - processes only the target source's documents (delegating each to
 *   EmbedDocumentChunksPipeline), leaving other sources' vectors untouched
 * - re-running for the same source replaces the vector for a given
 *   chunk id rather than duplicating it
 * - a source with no matching documents succeeds with a zero-count result
 * - rejects invalid input (missing workspaceId/sourceId, non-object)
 */
export const REINDEX_KNOWLEDGE_SOURCE_EMBEDDINGS_PIPELINE_UNIT_CASES = [
  "rejects_missing_source_without_side_effects",
  "rejects_cross_workspace_source_without_side_effects",
  "only_target_source_documents_are_processed",
  "rerun_replaces_same_chunk_id_vector",
  "empty_source_succeeds_with_zero_count",
  "rejects_invalid_input",
] as const;
