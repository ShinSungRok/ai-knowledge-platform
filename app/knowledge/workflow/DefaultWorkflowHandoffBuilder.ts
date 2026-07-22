import type { WorkflowHandoff } from "./WorkflowHandoff";
import type {
  WorkflowHandoffBuildInput,
  WorkflowHandoffBuilder,
} from "./WorkflowHandoffBuilder";
import type { WorkflowHandoffKind } from "./WorkflowHandoffKind";

/**
 * Default {@link WorkflowHandoffBuilder}.
 *
 * Kind selection (deterministic):
 * - `"delegation"` when `previous.role === "coordinator"` and
 *   `next.role !== "coordinator"` (reason `"coordinator-delegation"`)
 * - otherwise `"sequential"` (reason `"sequential-pass"`)
 *
 * Enforces completed previous status, non-empty trimmed payload,
 * non-empty workspaceId, and distinct from/to agent ids.
 */
export class DefaultWorkflowHandoffBuilder implements WorkflowHandoffBuilder {
  build(input: WorkflowHandoffBuildInput): WorkflowHandoff {
    if (!input || typeof input !== "object") {
      throw new Error("WorkflowHandoffBuildInput must be an object");
    }
    const { goal, previous, next } = input;
    if (!goal || typeof goal !== "object") {
      throw new Error("WorkflowGoal must be an object");
    }
    if (!previous || typeof previous !== "object") {
      throw new Error("previous WorkflowStepResult must be an object");
    }
    if (!next || typeof next !== "object") {
      throw new Error("next WorkflowPlanStep must be an object");
    }

    this.assertNonEmptyString(goal.workspaceId, "WorkflowGoal.workspaceId");
    this.assertNonEmptyString(previous.agentId, "previous.agentId");
    this.assertNonEmptyString(next.agentId, "next.agentId");
    this.assertNonEmptyString(previous.stepId, "previous.stepId");
    this.assertNonEmptyString(next.id, "next.id");

    if (previous.status !== "completed") {
      throw new Error(
        "Handoff requires previous step status completed",
      );
    }

    if (String(previous.agentId) === String(next.agentId)) {
      throw new Error("Handoff requires distinct agents");
    }

    const payload =
      typeof previous.output === "string" ? previous.output.trim() : "";
    if (payload.length === 0) {
      throw new Error("Handoff payload must be non-empty");
    }

    const kind = this.resolveKind(previous.role, next.role);
    const reason =
      kind === "delegation" ? "coordinator-delegation" : "sequential-pass";

    return {
      kind,
      fromAgentId: previous.agentId,
      toAgentId: next.agentId,
      fromStepId: previous.stepId,
      toStepId: next.id,
      workspaceId: goal.workspaceId,
      payload,
      reason,
    };
  }

  private resolveKind(
    previousRole: string,
    nextRole: string,
  ): WorkflowHandoffKind {
    if (previousRole === "coordinator" && nextRole !== "coordinator") {
      return "delegation";
    }
    return "sequential";
  }

  private assertNonEmptyString(value: unknown, label: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${label} must be a non-empty string`);
    }
  }
}
