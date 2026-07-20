/**
 * Unit-level cases for `ExecuteToolCallUseCase`
 * (`app/knowledge/application/ExecuteToolCallUseCase.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:application:tool-call
 *
 * Covered behaviors:
 * - depends only on the `ToolExecutor` port, verified via a static
 *   source-scan for forbidden concrete-adapter imports
 * - execute() delegates `{ name, arguments, timeoutMs }` to
 *   `ToolExecutor.execute` and returns the result unchanged
 * - rejects invalid name/arguments/timeoutMs input without calling the
 *   executor
 */
export const EXECUTE_TOOL_CALL_USE_CASE_UNIT_CASES = [
  "depends_only_on_tool_executor_port",
  "valid_delegation_and_unchanged_result",
  "rejects_invalid_input_without_calling_executor",
] as const;
