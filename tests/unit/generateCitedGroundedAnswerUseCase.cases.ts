/**
 * Unit-level cases for `GenerateCitedGroundedAnswerUseCase`
 * (`app/knowledge/application/GenerateCitedGroundedAnswerUseCase.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:application:cited-answer
 *
 * Covered behaviors:
 * - depends only on `GenerateGroundedAnswerUseCase` and the
 *   `CitationBuilder` port, verified via a static source-scan for a
 *   forbidden concrete-adapter or lower-level port import
 * - execute() calls GenerateGroundedAnswerUseCase.execute then
 *   CitationBuilder.build in exactly that order
 * - maps GenerateCitedGroundedAnswerInput onto
 *   GenerateGroundedAnswerUseCase's own GenerateGroundedAnswerInput
 *   (workspaceId/query/retrievalLimit/maxCharacters carried through
 *   unchanged)
 * - passes the returned GroundedAnswer to CitationBuilder.build
 *   unchanged
 * - returns `{ answer, citations }` as CitedGroundedAnswer unchanged,
 *   matching a direct call-sequence
 * - for an insufficient-evidence answer, CitationBuilder.build is still
 *   called and the result carries empty citations
 * - rejects invalid workspaceId/query/retrievalLimit/maxCharacters
 *   input (and a non-object input) before ever calling either
 *   dependency
 */
export const GENERATE_CITED_GROUNDED_ANSWER_USE_CASE_UNIT_CASES = [
  "depends_only_on_its_two_declared_dependencies",
  "evidence_present_calls_both_dependencies_in_order_with_mapped_inputs",
  "insufficient_evidence_still_calls_citation_builder_with_empty_citations",
  "execute_returns_cited_grounded_answer_unchanged",
  "execute_rejects_invalid_input_without_calling_any_dependency",
] as const;
