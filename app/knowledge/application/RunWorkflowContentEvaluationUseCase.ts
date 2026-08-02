import type { WorkflowContentEvaluationMetrics } from "../workflow/WorkflowContentEvaluationMetrics";
import type { WorkflowEvaluationDataset } from "../workflow/WorkflowEvaluationDataset";
import type { WorkflowMemoryEntry } from "../workflow/WorkflowMemoryEntry";
import type { WorkflowMemoryStore } from "../workflow/WorkflowMemoryStore";
import type { WorkflowOrchestrator } from "../workflow/WorkflowOrchestrator";
import type { WorkflowRunContentEvaluator } from "../workflow/WorkflowRunContentEvaluator";
import type { WorkflowRunResult } from "../workflow/WorkflowRunResult";
import { asWorkflowRunId } from "../workflow/WorkflowRunId";

/**
 * Input for running Multi-Agent workflow **content** evaluation over a
 * dataset — the LLM-as-judge counterpart to
 * {@link RunWorkflowEvaluationUseCase}.
 */
export interface RunWorkflowContentEvaluationInput {
  dataset: WorkflowEvaluationDataset;
}

/**
 * Run-workflow-content-evaluation use case: for each case, run
 * {@link WorkflowOrchestrator}, list Shared Workflow Memory, then score
 * with {@link WorkflowRunContentEvaluator}.
 *
 * Intentionally mirrors {@link RunWorkflowEvaluationUseCase}'s run+memory
 * collection loop rather than sharing it — both use cases stay small and
 * independently readable, and this repo has no precedent for a shared
 * cross-cutting "collect artifacts" helper for a two-caller case.
 *
 * Depends only on orchestrator / memory / content-evaluator ports.
 * Uses `workflowRunId = case.id` for deterministic memory scoping.
 */
export class RunWorkflowContentEvaluationUseCase {
  constructor(
    private readonly orchestrator: WorkflowOrchestrator,
    private readonly contentEvaluator: WorkflowRunContentEvaluator,
    private readonly memory: WorkflowMemoryStore,
  ) {}

  async execute(
    input: RunWorkflowContentEvaluationInput,
  ): Promise<WorkflowContentEvaluationMetrics> {
    const dataset = this.assertDataset(input?.dataset);

    const runsByCaseId = new Map<string, WorkflowRunResult>();
    const memoryByCaseId = new Map<string, readonly WorkflowMemoryEntry[]>();

    for (const evaluationCase of dataset.cases) {
      const run = await this.orchestrator.run({
        workspaceId: evaluationCase.workspaceId,
        objective: evaluationCase.objective,
        workflowRunId: asWorkflowRunId(evaluationCase.id),
      });
      runsByCaseId.set(evaluationCase.id, run);
      const entries = await this.memory.listByRun(
        evaluationCase.workspaceId,
        run.workflowRunId,
      );
      memoryByCaseId.set(evaluationCase.id, entries);
    }

    return this.contentEvaluator.evaluate({
      dataset,
      runsByCaseId,
      memoryByCaseId,
    });
  }

  private assertDataset(
    dataset: WorkflowEvaluationDataset | undefined,
  ): WorkflowEvaluationDataset {
    if (!dataset || typeof dataset !== "object") {
      throw new Error("WorkflowEvaluationDataset must be an object");
    }
    if (typeof dataset.id !== "string" || dataset.id.trim().length === 0) {
      throw new Error("WorkflowEvaluationDataset.id must be a non-empty string");
    }
    if (!Array.isArray(dataset.cases) || dataset.cases.length === 0) {
      throw new Error("dataset must contain at least one case");
    }
    return dataset;
  }
}
