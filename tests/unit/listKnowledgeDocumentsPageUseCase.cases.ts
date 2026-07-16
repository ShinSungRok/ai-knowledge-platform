/**
 * Unit-level cases for ListKnowledgeDocumentsPageUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:page
 *
 * Covered behaviors:
 * - defaults to id-ascending sort, page 1, pageSize 20
 * - sorts by title descending
 * - paginates results across pages
 * - out-of-range page returns empty items with accurate totalCount
 * - rejects invalid page/pageSize/sortBy/sortOrder
 * - use case depends on KnowledgeDocumentRepository port only
 *
 * Note: sorting by creation date is out of scope — `KnowledgeDocument` has
 * no timestamp field yet. Only `id` and `title` are supported sort fields.
 */
export const LIST_KNOWLEDGE_DOCUMENTS_PAGE_USE_CASE_UNIT_CASES = [
  "defaults_to_id_ascending_page_one",
  "sorts_by_title_descending",
  "paginates_results",
  "out_of_range_page_returns_empty",
  "rejects_invalid_page_and_pageSize_and_sortBy_and_sortOrder",
  "depends_on_repository_port_not_adapter",
] as const;
