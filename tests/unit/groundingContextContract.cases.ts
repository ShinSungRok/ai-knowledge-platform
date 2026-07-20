/**
 * Unit-level cases for the `app/knowledge/context` grounding context
 * contract (`ContextAssemblyInput`, `GroundingContextBlock`,
 * `GroundingContext`, `ContextAssembler`).
 *
 * Executed via:
 *
 *   pnpm validate:context:contract
 *
 * Covered behaviors:
 * - KNOWLEDGE_MODULE_CONTEXT is exported with its expected value
 * - ContextAssembler is implementable from just the exported contract
 *   types (no concrete adapter exists yet) and its `assemble` method is
 *   callable, returning a GroundingContext whose `query`/`blocks`/
 *   `content`/`truncated` fields match the shapes declared by
 *   GroundingContext/GroundingContextBlock
 * - ContextAssemblyInput/GroundingContext accommodate an empty chunk list
 *   (empty blocks, empty content, truncated=false)
 * - the top-level app/knowledge barrel re-exports
 *   ContextAssemblyInput/GroundingContextBlock/GroundingContext/
 *   ContextAssembler, verified via a compile-time type-assignability check
 */
export const GROUNDING_CONTEXT_CONTRACT_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "context_assembler_port_contract_is_implementable_and_callable",
  "context_assembly_input_accepts_empty_chunks",
  "top_level_barrel_exports_contract_types",
] as const;
