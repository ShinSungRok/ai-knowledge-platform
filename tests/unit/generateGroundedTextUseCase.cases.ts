/**
 * Unit-level cases for `GenerateGroundedTextUseCase`
 * (`app/knowledge/application/GenerateGroundedTextUseCase.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:application:generate-text
 *
 * Covered behaviors:
 * - depends only on `BuildGroundedPromptUseCase` and the
 *   `LanguageModelProvider` port, verified via a static source-scan for
 *   a forbidden concrete-adapter or lower-level port/use-case import
 * - execute() calls BuildGroundedPromptUseCase.execute before
 *   LanguageModelProvider.generate (verified via a shared call-order
 *   log across both counting test doubles)
 * - maps GenerateGroundedTextInput onto BuildGroundedPromptUseCase's own
 *   BuildGroundedPromptInput (workspaceId/query/retrievalLimit/
 *   maxCharacters carried through unchanged)
 * - passes BuildGroundedPromptUseCase's own returned GroundedPrompt
 *   straight into LanguageModelProvider.generate, unchanged
 * - returns the LanguageModelProvider's GeneratedText unchanged,
 *   matching a direct BuildGroundedPromptUseCase.execute ->
 *   LanguageModelProvider.generate call sequence
 * - rejects invalid workspaceId/query/retrievalLimit/maxCharacters input
 *   (and a non-object input) before ever calling
 *   BuildGroundedPromptUseCase or LanguageModelProvider
 */
export const GENERATE_GROUNDED_TEXT_USE_CASE_UNIT_CASES = [
  "depends_only_on_build_grounded_prompt_use_case_and_language_model_provider",
  "execute_calls_build_grounded_prompt_before_language_model_provider",
  "execute_maps_build_grounded_prompt_input_from_use_case_input",
  "execute_passes_grounded_prompt_to_language_model_provider_unchanged",
  "execute_returns_generated_text_unchanged",
  "execute_rejects_invalid_input_without_calling_either_dependency",
] as const;
