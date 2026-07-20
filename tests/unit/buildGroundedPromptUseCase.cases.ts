/**
 * Unit-level cases for `BuildGroundedPromptUseCase`
 * (`app/knowledge/application/BuildGroundedPromptUseCase.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:application:prompt
 *
 * Covered behaviors:
 * - depends only on `RetrieveGroundingContextUseCase` and the
 *   `PromptBuilder` port, verified via a static source-scan for a
 *   forbidden concrete-adapter or lower-level port/use-case import
 * - execute() calls RetrieveGroundingContextUseCase.execute before
 *   PromptBuilder.build (verified via a shared call-order log across
 *   both counting test doubles)
 * - maps BuildGroundedPromptInput onto
 *   RetrieveGroundingContextUseCase's own RetrieveGroundingContextInput
 *   (workspaceId/query/retrievalLimit/maxCharacters carried through
 *   unchanged)
 * - passes RetrieveGroundingContextUseCase's own returned
 *   GroundingContext straight into PromptBuilder.build, unchanged
 * - returns the PromptBuilder's GroundedPrompt unchanged, matching a
 *   direct RetrieveGroundingContextUseCase.execute ->
 *   PromptBuilder.build call sequence
 * - rejects invalid workspaceId/query/retrievalLimit/maxCharacters input
 *   (and a non-object input) before ever calling
 *   RetrieveGroundingContextUseCase or PromptBuilder
 */
export const BUILD_GROUNDED_PROMPT_USE_CASE_UNIT_CASES = [
  "depends_only_on_retrieve_grounding_context_use_case_and_prompt_builder",
  "execute_calls_retrieve_grounding_context_before_prompt_builder",
  "execute_maps_retrieve_grounding_context_input_from_use_case_input",
  "execute_passes_grounding_context_to_prompt_builder_unchanged",
  "execute_returns_grounded_prompt_unchanged",
  "execute_rejects_invalid_input_without_calling_either_dependency",
] as const;
