/**
 * Unit-level cases for the `app/knowledge/tools` contract
 * (`ToolCallStatus`, `ToolCallRequest`, `ToolCallResult`,
 * `ToolExecutor`).
 *
 * Executed via:
 *
 *   pnpm validate:tools:contract
 *
 * Covered behaviors:
 * - KNOWLEDGE_MODULE_TOOLS is exported with its expected value
 * - ToolExecutor is implementable from just the exported contract
 *   types (FakeToolExecutor) and its `execute` method is callable,
 *   returning a success-shaped ToolCallResult
 * - ToolCallResult accommodates an ok=false error shape without a
 *   result
 * - the top-level app/knowledge barrel re-exports ToolExecutor (and
 *   related contract types), verified via a compile-time
 *   type-assignability check
 */
export const TOOL_CALLING_CONTRACT_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "tool_executor_port_contract_is_implementable_and_callable",
  "tool_executor_accommodates_error_result_shape",
  "top_level_barrel_exports_contract_types",
] as const;
