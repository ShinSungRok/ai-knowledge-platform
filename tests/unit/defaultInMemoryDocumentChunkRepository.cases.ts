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
 * - findById resolves a chunk by its workspace-global id, returns null for
 *   a missing id, and returns null for an id that only exists in a
 *   different workspace
 * - replaceForDocument allows a document to reuse an id it already owns
 *   (e.g. re-chunking with a deterministic id scheme)
 * - replaceForDocument rejects a chunk id already owned by a *different*
 *   document in the same workspace, with no partial write to either
 *   document's chunk set or the ownership index
 * - FixedSizeDocumentChunker-generated ids from two different documents
 *   never collide and each resolves back to its own document via findById
 * - findAll returns every chunk in a workspace ordered by documentId
 *   ascending, then order ascending within a document, regardless of
 *   insertion order or write order
 * - findAll only returns chunks within the requested workspace, returns
 *   an empty array for a workspace with no chunks, and returns defensive
 *   copies
 * - findAll rejects an empty or whitespace-only workspaceId
 * - replaceForDocument rejects a chunk whose workspaceId/documentId does
 *   not match the method arguments
 * - replaceForDocument rejects duplicate chunk id or duplicate order
 *   within the same batch, saving nothing
 * - replaceForDocument rejects negative or non-integer order
 * - rejects empty workspaceId/documentId/id/text on all methods
 */
export const DEFAULT_IN_MEMORY_DOCUMENT_CHUNK_REPOSITORY_UNIT_CASES = [
  "implements_DocumentChunkRepository_port",
  "findByDocumentId_returns_order_ascending",
  "replaceForDocument_replaces_entire_existing_set",
  "replaceForDocument_with_empty_array_clears_chunks",
  "isolated_across_documents_in_same_workspace",
  "isolated_across_workspaces_for_same_documentId",
  "defensive_copy_on_replace_input_and_find_output",
  "findById_resolves_workspace_global_chunk",
  "findById_returns_null_for_missing_or_cross_workspace_chunk",
  "replaceForDocument_allows_same_document_to_reuse_its_own_chunk_ids",
  "replaceForDocument_rejects_chunk_id_owned_by_different_document_without_partial_write",
  "fixed_size_document_chunker_ids_are_workspace_global_compatible",
  "find_all_returns_deterministic_workspace_order",
  "find_all_orders_across_many_documents_and_orders",
  "find_all_isolates_by_workspace",
  "find_all_returns_empty_array_for_unknown_workspace",
  "find_all_defensive_copy",
  "find_all_rejects_empty_workspace_id",
  "rejects_workspaceId_and_documentId_scope_mismatch",
  "rejects_duplicate_id_and_duplicate_order",
  "rejects_negative_or_non_integer_order",
  "rejects_empty_workspaceId_documentId_id_text",
] as const;
