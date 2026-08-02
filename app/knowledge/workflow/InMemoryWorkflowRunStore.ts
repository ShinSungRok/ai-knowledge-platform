import { asWorkflowRunId, type WorkflowRunId } from "./WorkflowRunId";
import type { WorkflowRunRecord } from "./WorkflowRunRecord";
import type {
  WorkflowRunSaveInput,
  WorkflowRunStore,
} from "./WorkflowRunStore";
import type { WorkflowRunResult } from "./WorkflowRunResult";
import type { WorkflowStepResult } from "./WorkflowStepResult";

/**
 * In-memory {@link WorkflowRunStore}: workspace-scoped Multi-Agent
 * workflow run persistence with defensive copies and cross-workspace
 * isolation.
 *
 * Mirrors Project 4's InMemory experiment-run-store conventions. No
 * SQL/Postgres adapter.
 */
export class InMemoryWorkflowRunStore implements WorkflowRunStore {
  private readonly runsByWorkspace = new Map<
    string,
    Map<string, WorkflowRunRecord>
  >();

  async save(input: WorkflowRunSaveInput): Promise<WorkflowRunRecord> {
    const validated = this.toSaveInput(input);
    const workflowRunId = validated.result.workflowRunId;
    const workspaceRuns = this.getOrCreateWorkspace(validated.workspaceId);
    if (workspaceRuns.has(workflowRunId)) {
      throw new Error(`Duplicate workflow run id: ${workflowRunId}`);
    }
    const record: WorkflowRunRecord = {
      workflowRunId,
      workspaceId: validated.workspaceId,
      objective: validated.objective,
      result: validated.result,
    };
    workspaceRuns.set(workflowRunId, this.clone(record));
    return this.clone(record);
  }

  async getById(
    workspaceId: string,
    workflowRunId: WorkflowRunId,
  ): Promise<WorkflowRunRecord | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const id = asWorkflowRunId(workflowRunId);
    const stored = this.runsByWorkspace.get(workspaceId)?.get(id);
    return stored ? this.clone(stored) : null;
  }

  private getOrCreateWorkspace(
    workspaceId: string,
  ): Map<string, WorkflowRunRecord> {
    let workspace = this.runsByWorkspace.get(workspaceId);
    if (!workspace) {
      workspace = new Map();
      this.runsByWorkspace.set(workspaceId, workspace);
    }
    return workspace;
  }

  private toSaveInput(input: WorkflowRunSaveInput): WorkflowRunSaveInput {
    if (!input || typeof input !== "object") {
      throw new Error("WorkflowRunSaveInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    this.assertNonEmptyString(input.objective, "objective");
    if (!input.result || typeof input.result !== "object") {
      throw new Error("result must be an object");
    }
    const workflowRunId = asWorkflowRunId(String(input.result.workflowRunId));
    return {
      workspaceId: input.workspaceId,
      objective: input.objective,
      result: { ...input.result, workflowRunId },
    };
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${field} must be a non-empty string`);
    }
  }

  private cloneStepResults(
    stepResults: readonly WorkflowStepResult[],
  ): WorkflowStepResult[] {
    return stepResults.map((step) => ({
      ...step,
      ...(step.handoff !== undefined ? { handoff: { ...step.handoff } } : {}),
    }));
  }

  private cloneResult(result: WorkflowRunResult): WorkflowRunResult {
    return {
      ...result,
      plan: { ...result.plan, steps: [...result.plan.steps] },
      stepResults: this.cloneStepResults(result.stepResults),
    };
  }

  private clone(record: WorkflowRunRecord): WorkflowRunRecord {
    return {
      workflowRunId: record.workflowRunId,
      workspaceId: record.workspaceId,
      objective: record.objective,
      result: this.cloneResult(record.result),
    };
  }
}

/** Alias matching Default* adapter naming used elsewhere in the repo. */
export { InMemoryWorkflowRunStore as DefaultWorkflowRunStore };
