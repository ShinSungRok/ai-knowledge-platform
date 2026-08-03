import type { WorkflowOrchestrator } from "../workflow/WorkflowOrchestrator";
import type { WorkflowRunResult } from "../workflow/WorkflowRunResult";
import type { WorkflowRunStore } from "../workflow/WorkflowRunStore";

/**
 * Input for a single Multi-Agent workflow HTTP/application run.
 */
export interface RunWorkflowInput {
  workspaceId: string;
  objective: string;
  metadata?: Readonly<Record<string, string>>;
}

/**
 * JSON-friendly view of {@link WorkflowRunResult} for HTTP responses.
 */
export interface RunWorkflowResultView {
  workspaceId: string;
  objective: string;
  workflowRunId: string;
  status: string;
  summary?: string;
  stepResults: readonly {
    stepId: string;
    agentId: string;
    role: string;
    status: string;
    output: string;
    error?: string;
  }[];
}

/**
 * Thin application wrapper: run one {@link WorkflowOrchestrator} goal and
 * return a serializable view (omits full plan graph).
 *
 * Depends only on the orchestrator port, plus an optional
 * {@link WorkflowRunStore} — when provided, the run result is persisted
 * after a successful run so it can later be fetched by id over HTTP.
 */
export class RunWorkflowUseCase {
  constructor(
    private readonly orchestrator: WorkflowOrchestrator,
    private readonly runStore?: WorkflowRunStore,
  ) {}

  async execute(input: RunWorkflowInput): Promise<RunWorkflowResultView> {
    if (!input || typeof input !== "object") {
      throw new Error("RunWorkflowInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error("workspaceId must be a non-empty string");
    }
    if (
      typeof input.objective !== "string" ||
      input.objective.trim().length === 0
    ) {
      throw new Error("objective must be a non-empty string");
    }

    const workspaceId = input.workspaceId.trim();
    const objective = input.objective.trim();
    const result = await this.orchestrator.run({
      workspaceId,
      objective,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    });
    if (this.runStore !== undefined) {
      await this.runStore.save({ workspaceId, objective, result });
    }
    return toWorkflowRunResultView(workspaceId, objective, result);
  }
}

export function toWorkflowRunResultView(
  workspaceId: string,
  objective: string,
  result: WorkflowRunResult,
): RunWorkflowResultView {
  return {
    workspaceId,
    objective,
    workflowRunId: String(result.workflowRunId),
    status: result.status,
    ...(result.summary !== undefined ? { summary: result.summary } : {}),
    stepResults: result.stepResults.map((step) => ({
      stepId: String(step.stepId),
      agentId: String(step.agentId),
      role: step.role,
      status: step.status,
      output: step.output,
      ...(step.error !== undefined ? { error: step.error } : {}),
    })),
  };
}
