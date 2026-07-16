/**
 * Unit-level cases for DefaultInMemoryDocumentChunkRepository.
 *
 * Executed via:
 *
 *   pnpm validate:repository:chunk
 *
 * Covered behaviors:
 * - implements the DocumentChunkRepository port contract
 * - findByDocumentId returns chunks sorted by order ascending, regardless
 *   of input order
 * - replaceForDocument replaces the entire existing chunk set for a
 *   document, not a merge/patch
 * - replaceForDocument with an empty array clears all existing chunks for
 *   the document
 * - chunks are isolated per documentId within the same workspace
 * - chunks are isolated per workspace for the same documentId
 * - defensive copy on both replaceForDocument input and findByDocumentId
 *   output
 * - replaceForDocument rejects a chunk whose workspaceId/documentId does
 *   not match the method arguments
 * - replaceForDocument rejects duplicate chunk id or duplicate order
 *   within the same batch, saving nothing
 * - replaceForDocument rejects negative or non-integer order
 * - rejects empty workspaceId/documentId/id/text on both methods
 */
export const DEFAULT_IN_MEMORY_DOCUMENT_CHUNK_REPOSITORY_UNIT_CASES = [
  "implements_DocumentChunkRepository_port",
  "findByDocumentId_returns_order_ascending",
  "replaceForDocument_replaces_entire_existing_set",
  "replaceForDocument_with_empty_array_clears_chunks",
  "isolated_across_documents_in_same_workspace",
  "isolated_across_workspaces_for_same_documentId",
  "defensive_copy_on_replace_input_and_find_output",
  "rejects_workspaceId_and_documentId_scope_mismatch",
  "rejects_duplicate_id_and_duplicate_order",
  "rejects_negative_or_non_integer_order",
  "rejects_empty_workspaceId_documentId_id_text",
] as const;
