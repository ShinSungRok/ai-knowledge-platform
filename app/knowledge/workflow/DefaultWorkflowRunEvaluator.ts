import type { WorkflowCaseScore } from "./WorkflowCaseScore";
import type { WorkflowEvaluationCase } from "./WorkflowEvaluationCase";
import type { WorkflowEvaluationDataset } from "./WorkflowEvaluationDataset";
import type { WorkflowEvaluationMetrics } from "./WorkflowEvaluationMetrics";
import type { WorkflowMemoryEntry } from "./WorkflowMemoryEntry";
import type { WorkflowRunResult } from "./WorkflowRunResult";
import type {
  WorkflowRunEvaluator,
  WorkflowRunEvaluatorInput,
} from "./WorkflowRunEvaluator";
import type { WorkflowRunStatus } from "./WorkflowRunStatus";

/**
 * Deterministic pure {@link WorkflowRunEvaluator}: scores Multi-Agent
 * workflow run (+ optional memory) artifacts against case expectations.
 *
 * No constructor dependencies — does not import orchestrator, registry,
 * invoker, LLM, or network adapters.
 */
export class DefaultWorkflowRunEvaluator implements WorkflowRunEvaluator {
  evaluate(input: WorkflowRunEvaluatorInput): WorkflowEvaluationMetrics {
    const { dataset, runsByCaseId, memoryByCaseId } = this.toInput(input);
    if (dataset.cases.length === 0) {
      throw new Error("dataset must contain at least one case");
    }

    const caseScores: WorkflowCaseScore[] = [];
    for (const evaluationCase of dataset.cases) {
      caseScores.push(
        this.scoreCase(evaluationCase, runsByCaseId, memoryByCaseId),
      );
    }

    const caseCount = caseScores.length;
    const passedCount = caseScores.filter((score) => score.passed).length;
    return {
      datasetId: dataset.id,
      caseCount,
      passedCount,
      passRate: passedCount / caseCount,
      caseScores,
    };
  }

  private scoreCase(
    evaluationCase: WorkflowEvaluationCase,
    runsByCaseId: ReadonlyMap<string, WorkflowRunResult>,
    memoryByCaseId:
      | ReadonlyMap<string, readonly WorkflowMemoryEntry[]>
      | undefined,
  ): WorkflowCaseScore {
    const run = runsByCaseId.get(evaluationCase.id);
    if (!run) {
      return {
        caseId: evaluationCase.id,
        passed: false,
        actualStatus: "failed",
        failureReasons: ["missing-run"],
      };
    }

    const failureReasons: string[] = [];
    const actualStatus: WorkflowRunStatus = run.status;

    if (run.status !== evaluationCase.expectStatus) {
      failureReasons.push(
        `status-mismatch:expected=${evaluationCase.expectStatus}:actual=${run.status}`,
      );
    }

    if (evaluationCase.expectMinCompletedSteps !== undefined) {
      const completed = run.stepResults.filter(
        (step) => step.status === "completed",
      ).length;
      if (completed < evaluationCase.expectMinCompletedSteps) {
        failureReasons.push(
          `min-completed-steps:expected=${evaluationCase.expectMinCompletedSteps}:actual=${completed}`,
        );
      }
    }

    if (evaluationCase.expectRequiredRoles !== undefined) {
      const completedRoles = new Set(
        run.stepResults
          .filter((step) => step.status === "completed")
          .map((step) => step.role),
      );
      for (const role of evaluationCase.expectRequiredRoles) {
        if (!completedRoles.has(role)) {
          failureReasons.push(`missing-required-role:${role}`);
        }
      }
    }

    if (evaluationCase.expectHandoff === true) {
      const hasHandoff = run.stepResults.some(
        (step) => step.handoff !== undefined,
      );
      if (!hasHandoff) {
        failureReasons.push("missing-handoff");
      }
    }

    if (evaluationCase.expectMemoryKinds !== undefined) {
      if (!memoryByCaseId) {
        failureReasons.push("missing-memory");
      } else {
        const entries = memoryByCaseId.get(evaluationCase.id);
        if (!entries) {
          failureReasons.push("missing-memory");
        } else {
          const kinds = new Set(entries.map((entry) => entry.kind));
          for (const kind of evaluationCase.expectMemoryKinds) {
            if (!kinds.has(kind)) {
              failureReasons.push(`missing-memory-kind:${kind}`);
            }
          }
        }
      }
    }

    return {
      caseId: evaluationCase.id,
      passed: failureReasons.length === 0,
      actualStatus,
      ...(failureReasons.length > 0 ? { failureReasons } : {}),
    };
  }

  private toInput(input: WorkflowRunEvaluatorInput): WorkflowRunEvaluatorInput {
    if (!input || typeof input !== "object") {
      throw new Error("WorkflowRunEvaluatorInput must be an object");
    }
    const dataset = this.assertDataset(input.dataset);
    if (!(input.runsByCaseId instanceof Map)) {
      throw new Error("WorkflowRunEvaluatorInput.runsByCaseId must be a Map");
    }
    if (
      input.memoryByCaseId !== undefined &&
      !(input.memoryByCaseId instanceof Map)
    ) {
      throw new Error(
        "WorkflowRunEvaluatorInput.memoryByCaseId must be a Map when present",
      );
    }
    return {
      dataset,
      runsByCaseId: input.runsByCaseId,
      ...(input.memoryByCaseId !== undefined
        ? { memoryByCaseId: input.memoryByCaseId }
        : {}),
    };
  }

  private assertDataset(
    dataset: WorkflowEvaluationDataset,
  ): WorkflowEvaluationDataset {
    if (!dataset || typeof dataset !== "object") {
      throw new Error("WorkflowEvaluationDataset must be an object");
    }
    if (typeof dataset.id !== "string" || dataset.id.trim().length === 0) {
      throw new Error("WorkflowEvaluationDataset.id must be a non-empty string");
    }
    if (!Array.isArray(dataset.cases)) {
      throw new Error("WorkflowEvaluationDataset.cases must be an array");
    }
    return dataset;
  }
}
