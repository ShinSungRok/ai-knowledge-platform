import type { AgentPlan } from "./AgentPlan";
import type { AgentStepResult } from "./AgentStepResult";
import type { AgentReviewResult } from "./AgentReviewResult";

/**
 * Port for reviewing a completed plan execution. Reviewers judge
 * tool-call status / plan-result shape only — never Domain/RAG answer
 * content quality.
 */
export interface AgentReviewer {
  review(
    plan: AgentPlan,
    stepResults: readonly AgentStepResult[],
  ): Promise<AgentReviewResult>;
}
