import type { AgentPlan } from "./AgentPlan";
import type { AgentStepResult } from "./AgentStepResult";
import type { AgentReviewResult } from "./AgentReviewResult";
import type { AgentExecutionStatus } from "./AgentExecutionStatus";

/**
 * Full result of a single Agent orchestration run: the plan that was
 * executed, ordered step results, the reviewer outcome, and the
 * derived {@link AgentExecutionStatus}.
 */
export interface AgentRunResult {
  plan: AgentPlan;
  stepResults: readonly AgentStepResult[];
  review: AgentReviewResult;
  status: AgentExecutionStatus;
}
