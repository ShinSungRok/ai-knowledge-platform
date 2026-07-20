/**
 * Unit-level cases for the `app/knowledge/rag` contract
 * (`GroundedAnswer`, `GroundedAnswerAssemblyInput`,
 * `GroundedAnswerAssembler`).
 *
 * Executed via:
 *
 *   pnpm validate:rag:answer-contract
 *
 * Covered behaviors:
 * - KNOWLEDGE_MODULE_RAG is exported with its expected value
 * - GroundedAnswerAssembler is implementable from just the exported
 *   contract types (no concrete adapter exists yet) and its `assemble`
 *   method is callable, returning a `GroundedAnswer` whose shape
 *   matches the rag module's own `GroundedAnswer`
 * - GroundedAnswerAssemblyInput/GroundedAnswer accommodate an
 *   empty-evidence GroundingContext (empty blocks -> empty evidence,
 *   insufficientEvidence=true)
 * - the top-level app/knowledge barrel re-exports
 *   GroundedAnswer/GroundedAnswerAssemblyInput/GroundedAnswerAssembler,
 *   verified via a compile-time type-assignability check
 */
export const GROUNDED_ANSWER_ASSEMBLER_CONTRACT_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "grounded_answer_assembler_port_contract_is_implementable_and_callable",
  "grounded_answer_assembler_accepts_empty_evidence_context",
  "top_level_barrel_exports_contract_types",
] as const;
