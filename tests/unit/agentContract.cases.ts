/**
 * Unit-level cases for the `app/knowledge/agent` contract
 * (roles, goal/plan/state types, and planner/step-executor/reviewer/
 * orchestrator ports).
 *
 * Executed via:
 *
 *   pnpm validate:agent:contract
 *
 * Covered behaviors:
 * - KNOWLEDGE_MODULE_AGENT is exported with its expected value
 * - AgentPlanner, AgentStepExecutor, AgentReviewer, and
 *   AgentOrchestrator are implementable from just the exported
 *   contract types (Fake*) and return expected result shapes
 * - the top-level app/knowledge barrel re-exports the agent port
 *   types, verified via compile-time type-assignability checks
 */
export const AGENT_CONTRACT_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "agent_ports_are_implementable_and_callable",
  "top_level_barrel_exports_contract_types",
] as const;
