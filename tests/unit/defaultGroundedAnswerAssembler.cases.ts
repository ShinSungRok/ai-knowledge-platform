/**
 * Unit-level cases for `DefaultGroundedAnswerAssembler`
 * (`app/knowledge/rag/DefaultGroundedAnswerAssembler.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:rag:answer-assembler
 *
 * Covered behaviors:
 * - port contract: assemble is defined and callable
 * - empty context.blocks short-circuits to the fixed
 *   insufficient-evidence result (`text`, `evidence: []`,
 *   `insufficientEvidence: true`), discarding any given generated text
 * - non-empty context.blocks returns generatedText.text unchanged plus
 *   a copy of context.blocks as evidence, with insufficientEvidence=false
 * - context.truncated=true is never treated as evidence absence on its
 *   own: a truncated context with at least one block still returns
 *   generated text
 * - never mutates the input context/generatedText and always returns
 *   fresh evidence objects (defensive copies)
 * - returns equivalent output for the same input across repeated calls
 *   (deterministic)
 * - rejects an invalid GroundedAnswerAssemblyInput, GroundingContext,
 *   GroundingContextBlock, or GeneratedText
 * - DefaultGroundedAnswerAssembler imports only ports, never a concrete
 *   adapter, provider, or repository
 */
export const DEFAULT_GROUNDED_ANSWER_ASSEMBLER_UNIT_CASES = [
  "port_contract_assemble_is_defined",
  "empty_evidence_short_circuits_to_insufficient_evidence",
  "evidence_present_returns_generated_text_and_evidence",
  "truncated_with_evidence_still_returns_generated_text",
  "returns_defensive_copies_and_does_not_mutate_input",
  "deterministic_for_repeated_calls",
  "rejects_invalid_input",
  "imports_only_ports_never_concrete_adapter",
] as const;
