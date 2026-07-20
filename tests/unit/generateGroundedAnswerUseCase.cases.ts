/**
 * Unit-level cases for `GenerateGroundedAnswerUseCase`
 * (`app/knowledge/application/GenerateGroundedAnswerUseCase.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:application:grounded-answer
 *
 * Covered behaviors:
 * - depends only on `RetrieveGroundingContextUseCase`, the
 *   `PromptBuilder` port, the `LanguageModelProvider` port, and the
 *   `GroundedAnswerAssembler` port, verified via a static source-scan
 *   for a forbidden concrete-adapter or standalone-use-case import
 * - when the retrieved context carries evidence, execute() calls
 *   RetrieveGroundingContextUseCase.execute, then PromptBuilder.build,
 *   then LanguageModelProvider.generate, then
 *   GroundedAnswerAssembler.assemble, in exactly that order (verified
 *   via a shared call-order log across all four counting test doubles)
 * - maps GenerateGroundedAnswerInput onto
 *   RetrieveGroundingContextUseCase's own RetrieveGroundingContextInput
 *   (workspaceId/query/retrievalLimit/maxCharacters carried through
 *   unchanged)
 * - passes the retrieved GroundingContext to PromptBuilder.build, the
 *   built GroundedPrompt to LanguageModelProvider.generate, and both
 *   the context and the generated text to
 *   GroundedAnswerAssembler.assemble, unchanged at each step
 * - when the retrieved context carries no evidence blocks,
 *   PromptBuilder.build and LanguageModelProvider.generate are never
 *   called; GroundedAnswerAssembler.assemble is called once with the
 *   empty-evidence context and an empty GeneratedText.text
 * - returns the GroundedAnswerAssembler's GroundedAnswer unchanged,
 *   matching a direct call-sequence in both the evidence-present and
 *   evidence-absent cases
 * - rejects invalid workspaceId/query/retrievalLimit/maxCharacters input
 *   (and a non-object input) before ever calling any of its four
 *   dependencies
 */
export const GENERATE_GROUNDED_ANSWER_USE_CASE_UNIT_CASES = [
  "depends_only_on_its_four_declared_dependencies",
  "evidence_present_calls_all_four_dependencies_in_order_with_mapped_inputs",
  "evidence_absent_skips_prompt_builder_and_provider",
  "execute_returns_grounded_answer_unchanged",
  "execute_rejects_invalid_input_without_calling_any_dependency",
] as const;
