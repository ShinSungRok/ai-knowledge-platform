/**
 * Unit-level cases for the `app/knowledge/prompt` contract
 * (`GroundedPrompt`, `PromptBuilder`).
 *
 * Executed via:
 *
 *   pnpm validate:prompt:contract
 *
 * Covered behaviors:
 * - KNOWLEDGE_MODULE_PROMPT is exported with its expected value
 * - PromptBuilder is implementable from just the exported contract types
 *   (no concrete adapter exists yet) and its `build` method is callable,
 *   returning a `GroundedPrompt` whose shape matches the prompt module's
 *   own `GroundedPrompt`
 * - PromptBuilder/GroundedPrompt accommodate an empty GroundingContext
 *   (empty blocks/content)
 * - the top-level app/knowledge barrel re-exports
 *   GroundedPrompt/PromptBuilder, verified via a compile-time
 *   type-assignability check
 */
export const PROMPT_BUILDER_CONTRACT_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "prompt_builder_port_contract_is_implementable_and_callable",
  "prompt_builder_accepts_empty_grounding_context",
  "top_level_barrel_exports_contract_types",
] as const;
