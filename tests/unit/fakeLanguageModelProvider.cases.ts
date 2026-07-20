/**
 * Unit-level cases for `FakeLanguageModelProvider`
 * (`app/knowledge/ai/FakeLanguageModelProvider.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:ai:fake-provider
 *
 * Covered behaviors:
 * - port contract: generate is defined and callable
 * - generate returns { text: prompt.userMessage } exactly
 * - generate accommodates an empty userMessage
 * - generate returns byte-identical output for the same input across
 *   repeated calls (deterministic)
 * - generate never mutates the input GroundedPrompt and always returns a
 *   fresh GeneratedText object
 * - generate rejects an invalid GroundedPrompt (missing/non-object
 *   input, missing/empty systemInstruction, missing/mistyped
 *   userMessage)
 * - FakeLanguageModelProvider imports only the prompt/ai contract types,
 *   never a real provider, model SDK, network call, or lower-level
 *   retrieval/search/context/persistence/embedding adapter
 */
export const FAKE_LANGUAGE_MODEL_PROVIDER_UNIT_CASES = [
  "port_contract_generate_is_defined",
  "generate_maps_user_message_exactly",
  "generate_handles_empty_user_message",
  "deterministic_for_repeated_calls",
  "does_not_mutate_input_and_returns_fresh_object",
  "rejects_invalid_prompt",
  "imports_only_contract_types_never_real_provider_or_adapter",
] as const;
