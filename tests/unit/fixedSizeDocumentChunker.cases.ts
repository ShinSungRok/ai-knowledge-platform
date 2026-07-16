/**
 * Unit-level cases for FixedSizeDocumentChunker.
 *
 * Executed via:
 *
 *   pnpm validate:embedding:chunker
 *
 * Covered behaviors:
 * - implements the ChunkingService port contract
 * - constructor rejects a non-positive-integer maxChunkLength (zero,
 *   negative, non-integer, non-number)
 * - splits document text into fixed-size chunks with deterministic
 *   `${encodeURIComponent(document.id)}:chunk:${order}` ids and a
 *   0-based, contiguous order, each carrying the document's workspaceId
 *   and documentId
 * - splits by Unicode code point (via Array.from), never breaking a
 *   surrogate pair / astral character in two
 * - empty text yields an empty chunk array
 * - chunking the same document twice is deterministic (identical ids,
 *   order, and text)
 * - chunk() output is independent across calls — mutating one call's
 *   result does not affect a subsequent call
 * - rejects an invalid document (empty workspaceId/id, non-string text)
 */
export const FIXED_SIZE_DOCUMENT_CHUNKER_UNIT_CASES = [
  "implements_ChunkingService_port",
  "rejects_non_positive_integer_maxChunkLength",
  "splits_into_fixed_size_chunks_with_deterministic_ids",
  "splits_by_unicode_code_point_not_utf16_unit",
  "empty_text_returns_empty_array",
  "deterministic_across_repeated_calls",
  "output_independent_across_calls",
  "rejects_invalid_document",
] as const;
