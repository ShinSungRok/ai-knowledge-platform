/**
 * Unit-level cases for DefaultAgentReviewer.
 *
 * Executed via:
 *
 *   pnpm validate:agent:reviewer
 *
 * Covered behaviors:
 * - AgentReviewer port via DefaultAgentReviewer
 * - no ToolExecutor/LLM/repository imports
 * - all-success → approved
 * - step count mismatch → rejected
 * - non-success tool call status → rejected with status reason
 * - answer text is never reinterpreted
 */
export const DEFAULT_AGENT_REVIEWER_UNIT_CASES = [
  "depends_on_no_external_adapters",
  "port_contract_is_implementable",
  "all_success_is_approved",
  "step_count_mismatch_is_rejected",
  "non_success_status_is_rejected",
  "answer_text_is_not_reinterpreted",
] as const;
