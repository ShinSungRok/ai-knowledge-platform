/**
 * Unit-level cases for the `app/knowledge/ai` contract
 * (`GeneratedText`, `LanguageModelProvider`).
 *
 * Executed via:
 *
 *   pnpm validate:ai:provider-contract
 *
 * Covered behaviors:
 * - KNOWLEDGE_MODULE_AI is exported with its expected value
 * - LanguageModelProvider is implementable from just the exported
 *   contract types (no concrete adapter exists yet) and its `generate`
 *   method is callable, returning a `GeneratedText` whose shape matches
 *   the ai module's own `GeneratedText`
 * - LanguageModelProvider/GeneratedText accommodate a valid
 *   GroundedPrompt, including one with an empty userMessage
 * - the top-level app/knowledge barrel re-exports
 *   GeneratedText/LanguageModelProvider, verified via a compile-time
 *   type-assignability check
 */
export const LANGUAGE_MODEL_PROVIDER_CONTRACT_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "language_model_provider_port_contract_is_implementable_and_callable",
  "language_model_provider_accepts_valid_grounded_prompt",
  "top_level_barrel_exports_contract_types",
] as const;
