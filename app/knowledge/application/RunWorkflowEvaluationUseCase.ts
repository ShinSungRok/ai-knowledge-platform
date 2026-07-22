import type { WorkflowEvaluationDataset } from "../workflow/WorkflowEvaluationDataset";
import type { WorkflowEvaluationMetrics } from "../workflow/WorkflowEvaluationMetrics";
import type { WorkflowMemoryEntry } from "../workflow/WorkflowMemoryEntry";
import type { WorkflowMemoryStore } from "../workflow/WorkflowMemoryStore";
import type { WorkflowOrchestrator } from "../workflow/WorkflowOrchestrator";
import type { WorkflowRunEvaluator } from "../workflow/WorkflowRunEvaluator";
import type { WorkflowRunResult } from "../workflow/WorkflowRunResult";
import { asWorkflowRunId } from "../workflow/WorkflowRunId";

/**
 * Input for running Multi-Agent workflow evaluation over a dataset.
 */
export interface RunWorkflowEvaluationInput {
  dataset: WorkflowEvaluationDataset;
}

/**
 * Run-workflow-evaluation use case: for each case, run
 * {@link WorkflowOrchestrator}, list Shared Workflow Memory, then score
 * with {@link WorkflowRunEvaluator}.
 *
 * Depends only on orchestrator / memory / evaluator ports.
 * Uses `workflowRunId = case.id` for deterministic memory scoping.
 */
export class RunWorkflowEvaluationUseCase {
  constructor(
    private readonly orchestrator: WorkflowOrchestrator,
    private readonly evaluator: WorkflowRunEvaluator,
    private readonly memory: WorkflowMemoryStore,
  ) {}

  async execute(
    input: RunWorkflowEvaluationInput,
  ): Promise<WorkflowEvaluationMetrics> {
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

    return this.evaluator.evaluate({
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
