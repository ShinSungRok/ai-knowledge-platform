/**
 * Unit-level cases for ChunkKnowledgeDocumentPipeline.
 *
 * Executed via:
 *
 *   pnpm validate:pipeline:chunk-document
 *
 * Covered behaviors:
 * - rejects a missing document without calling the chunker or the chunk
 *   repository
 * - rejects a document registered only in a different workspace, with the
 *   same no-side-effect guarantee
 * - fully replaces a document's existing chunk set with the chunker's
 *   output (stale chunks never remain alongside new ones)
 * - an empty-text document clears any existing chunks (chunkCount 0)
 * - repeated runs on the same input produce a stable result (identical
 *   chunk ids/text/order, identical chunkCount)
 * - rejects invalid input (missing workspaceId/documentId, non-object)
 */
export const CHUNK_KNOWLEDGE_DOCUMENT_PIPELINE_UNIT_CASES = [
  "rejects_missing_document_without_side_effects",
  "rejects_cross_workspace_document_without_side_effects",
  "replaces_entire_existing_chunk_set",
  "empty_text_clears_existing_chunks",
  "repeated_runs_are_stable",
  "rejects_invalid_input",
] as const;
