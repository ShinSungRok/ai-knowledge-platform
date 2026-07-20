/**
 * Unit-level cases for `DefaultPromptBuilder`
 * (`app/knowledge/prompt/DefaultPromptBuilder.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:prompt:builder
 *
 * Covered behaviors:
 * - port contract: build is defined and callable
 * - always returns the fixed systemInstruction regardless of context
 * - reports "complete" status and includes GroundingContext.content
 *   verbatim in the fixed userMessage format when truncated=false
 * - reports "truncated" status when GroundingContext.truncated is true
 * - renders exactly "[none]" in place of the grounding context section
 *   when GroundingContext.content is empty
 * - derives the grounding context section only from
 *   GroundingContext.content, never re-derived from blocks (proving no
 *   evidence outside the assembled context leaks in)
 * - returns byte-identical output for the same input across repeated
 *   calls (deterministic)
 * - never mutates the input GroundingContext or its blocks array/objects
 * - rejects an invalid GroundingContext (missing/mistyped
 *   query/content/truncated/blocks) and malformed
 *   GroundingContextBlock entries (missing provenance ids, non-finite
 *   score)
 * - DefaultPromptBuilder imports only ports, never a concrete adapter,
 *   LLM provider, or repository
 */
export const DEFAULT_PROMPT_BUILDER_UNIT_CASES = [
  "port_contract_build_is_defined",
  "always_returns_fixed_system_instruction",
  "reports_complete_status_with_verbatim_content",
  "reports_truncated_status",
  "uses_none_fallback_for_empty_content",
  "never_introduces_evidence_outside_content",
  "deterministic_for_repeated_calls",
  "does_not_mutate_input",
  "rejects_invalid_context",
  "imports_only_ports_never_concrete_adapter",
] as const;
