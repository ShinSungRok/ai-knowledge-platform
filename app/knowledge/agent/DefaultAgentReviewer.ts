import type { AgentPlan } from "./AgentPlan";
import type { AgentStepResult } from "./AgentStepResult";
import type { AgentReviewResult } from "./AgentReviewResult";
import type { AgentReviewer } from "./AgentReviewer";

/**
 * Default {@link AgentReviewer}: judges plan execution by tool-call
 * status and step-result count only — never Domain/RAG answer content.
 *
 * No constructor dependencies. Rules:
 * - step result count ≠ plan step count → rejected (mismatch)
 * - any tool call status ≠ `"success"` → rejected with that status
 * - all tool calls succeeded → approved
 */
export class DefaultAgentReviewer implements AgentReviewer {
  async review(
    plan: AgentPlan,
    stepResults: readonly AgentStepResult[],
  ): Promise<AgentReviewResult> {
    if (stepResults.length !== plan.steps.length) {
      return {
        decision: "rejected",
        reason: "Step result count mismatch",
      };
    }

    for (const stepResult of stepResults) {
      if (stepResult.toolCall.status !== "success") {
        return {
          decision: "rejected",
          reason: `Tool call did not succeed: ${stepResult.toolCall.status}`,
        };
      }
    }

    return {
      decision: "approved",
      reason: "All tool calls succeeded",
    };
  }
}
