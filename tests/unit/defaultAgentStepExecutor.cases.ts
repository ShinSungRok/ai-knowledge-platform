/**
 * Unit-level cases for DefaultAgentStepExecutor.
 *
 * Executed via:
 *
 *   pnpm validate:agent:step-executor
 *
 * Covered behaviors:
 * - AgentStepExecutor port via DefaultAgentStepExecutor
 * - ToolExecutor-only dependency (static source scan)
 * - valid step → ToolExecutor.execute delegation + unchanged wrap
 * - invalid step/timeout rejection without calling ToolExecutor
 */
export const DEFAULT_AGENT_STEP_EXECUTOR_UNIT_CASES = [
  "depends_only_on_tool_executor_port",
  "port_contract_is_implementable",
  "execute_step_delegates_to_tool_executor",
  "invalid_step_or_timeout_is_rejected",
] as const;
