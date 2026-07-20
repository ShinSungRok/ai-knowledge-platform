/**
 * Unit-level cases for `DefaultContextAssembler`
 * (`app/knowledge/context/DefaultContextAssembler.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:context:assembler
 *
 * Covered behaviors:
 * - port contract: assemble is defined and callable
 * - hydrates each block's provenance (sourceId/documentId/chunkId/score/
 *   text) from the workspace-scoped KnowledgeDocumentRepository, and
 *   preserves the given chunk ranking order rather than re-sorting by
 *   score
 * - workspace isolation: a document is only hydrated from the requested
 *   workspace, never a same-id document belonging to a different
 *   workspace
 * - a chunk whose document no longer exists (stale) is silently excluded
 *   without setting truncated
 * - fixed rendering format:
 *   `[sourceId=<sourceId>;documentId=<documentId>;chunkId=<chunkId>]\n<chunk
 *   text>`, blocks joined by a blank line ("\n\n")
 * - whole-block budget adherence: a block is included only if it fits the
 *   remaining character budget in full; an oversized block is skipped
 *   whole (never truncated mid-text), and evaluation continues so a
 *   later, smaller block can still be included
 * - truncated=true whenever at least one candidate block was excluded for
 *   exceeding the remaining budget (never merely for a stale document)
 * - empty chunks input, and inputs where every candidate is stale or
 *   oversized, yield empty blocks/content
 * - invalid workspaceId/query/chunks/maxCharacters input, and malformed
 *   RetrievedChunk/DocumentChunk entries, are rejected before any
 *   repository call
 * - DefaultContextAssembler imports only ports (KnowledgeDocumentRepository),
 *   never a concrete adapter
 */
export const DEFAULT_CONTEXT_ASSEMBLER_UNIT_CASES = [
  "port_contract_assemble_is_defined",
  "hydrates_provenance_and_preserves_ranking_order",
  "isolates_document_hydration_by_workspace",
  "skips_stale_document_chunk_without_setting_truncated",
  "renders_fixed_block_format_joined_by_double_newline",
  "includes_block_only_when_whole_block_fits_budget_and_continues_past_oversized",
  "sets_truncated_when_later_block_exceeds_remaining_budget",
  "returns_empty_for_empty_chunks",
  "returns_empty_when_every_candidate_stale_or_oversized",
  "rejects_invalid_input_before_any_repository_call",
  "imports_only_ports_never_concrete_adapter",
] as const;
