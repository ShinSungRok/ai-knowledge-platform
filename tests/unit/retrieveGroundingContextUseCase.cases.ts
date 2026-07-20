/**
 * Unit-level cases for `RetrieveGroundingContextUseCase`
 * (`app/knowledge/application/RetrieveGroundingContextUseCase.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:application:grounding-context
 *
 * Covered behaviors:
 * - depends only on the RerankedSearch and ContextAssembler ports,
 *   verified via a static source-scan for a forbidden concrete-adapter
 *   or lower-level port import (including HybridSearch, Reranker,
 *   VectorRetriever, KeywordSearch)
 * - execute() calls RerankedSearch.search before ContextAssembler.assemble
 *   (verified via a shared call-order log across both counting test
 *   doubles)
 * - maps RetrieveGroundingContextInput onto RerankedSearch's RetrievalInput
 *   (workspaceId/query/retrievalLimit -> workspaceId/query/limit)
 * - maps the returned RetrievalResult.chunks onto ContextAssembler's
 *   ContextAssemblyInput (workspaceId/query/maxCharacters carried through
 *   from the use case's own input, chunks passed through unchanged and in
 *   the same order)
 * - returns the ContextAssembler's GroundingContext unchanged, matching a
 *   direct RerankedSearch.search -> ContextAssembler.assemble call
 *   sequence
 * - rejects invalid workspaceId/query/retrievalLimit/maxCharacters input
 *   (and a non-object input) before ever calling RerankedSearch or
 *   ContextAssembler
 */
export const RETRIEVE_GROUNDING_CONTEXT_USE_CASE_UNIT_CASES = [
  "depends_only_on_reranked_search_and_context_assembler_ports",
  "execute_calls_reranked_search_before_context_assembler",
  "execute_maps_retrieval_input_from_use_case_input",
  "execute_maps_context_assembly_input_from_retrieval_result",
  "execute_returns_grounding_context_unchanged",
  "execute_rejects_invalid_input_without_calling_either_dependency",
] as const;
