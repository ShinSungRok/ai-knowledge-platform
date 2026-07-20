/**
 * Unit-level cases for DeterministicKnowledgeAgentPlanner.
 *
 * Executed via:
 *
 *   pnpm validate:agent:planner
 *
 * Covered behaviors:
 * - AgentPlanner port contract via DeterministicKnowledgeAgentPlanner
 * - valid goal → single-step generate_cited_grounded_answer plan
 * - invalid AgentGoal field rejection
 * - byte-identical deterministic output for identical inputs
 * - no ToolExecutor / LLM / repository adapter imports
 */
export const DETERMINISTIC_KNOWLEDGE_AGENT_PLANNER_UNIT_CASES = [
  "port_contract_is_implementable",
  "valid_goal_yields_single_cited_answer_step",
  "invalid_goal_is_rejected",
  "plan_is_byte_identical_for_identical_inputs",
  "planner_imports_no_external_adapters",
] as const;
