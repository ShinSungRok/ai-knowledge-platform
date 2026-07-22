import type { WorkflowMemoryAppendInput } from "./WorkflowMemoryAppendInput";
import type { WorkflowMemoryEntry } from "./WorkflowMemoryEntry";
import type { WorkflowMemoryEntryKind } from "./WorkflowMemoryEntryKind";
import type { WorkflowMemoryStore } from "./WorkflowMemoryStore";
import { asWorkflowRunId, type WorkflowRunId } from "./WorkflowRunId";

const VALID_KINDS: readonly WorkflowMemoryEntryKind[] = [
  "objective",
  "step_output",
  "handoff",
  "note",
];

/**
 * In-memory {@link WorkflowMemoryStore}: workspace/workflow-run scoped
 * Shared Workflow Memory with deterministic ids and sequence ordering.
 *
 * Distinct from Project 2 {@link InMemoryMemoryStore} (session memory).
 * Does not import Knowledge search or session Memory adapters.
 */
export class InMemoryWorkflowMemoryStore implements WorkflowMemoryStore {
  private readonly entriesByWorkspace = new Map<
    string,
    Map<string, WorkflowMemoryEntry[]>
  >();

  async append(
    input: WorkflowMemoryAppendInput,
  ): Promise<WorkflowMemoryEntry> {
    const validated = this.toAppendInput(input);
    const runEntries = this.getOrCreateRun(
      validated.workspaceId,
      validated.workflowRunId,
    );
    const sequence = runEntries.length + 1;
    const entry: WorkflowMemoryEntry = {
      id: `${validated.workspaceId}:${validated.workflowRunId}:${sequence}`,
      workspaceId: validated.workspaceId,
      workflowRunId: validated.workflowRunId,
      kind: validated.kind,
      content: validated.content,
      sequence,
      ...(validated.agentId !== undefined
        ? { agentId: validated.agentId }
        : {}),
      ...(validated.stepId !== undefined ? { stepId: validated.stepId } : {}),
      ...(validated.handoffKind !== undefined
        ? { handoffKind: validated.handoffKind }
        : {}),
    };
    runEntries.push(this.clone(entry));
    return this.clone(entry);
  }

  async listByRun(
    workspaceId: string,
    workflowRunId: WorkflowRunId,
  ): Promise<readonly WorkflowMemoryEntry[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const runId = asWorkflowRunId(String(workflowRunId));
    const runEntries = this.entriesByWorkspace
      .get(workspaceId)
      ?.get(runId);
    if (!runEntries || runEntries.length === 0) {
      return [];
    }
    return runEntries
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((entry) => this.clone(entry));
  }

  /** Validation helper — clears all stored entries. */
  clear(): void {
    this.entriesByWorkspace.clear();
  }

  private getOrCreateRun(
    workspaceId: string,
    workflowRunId: WorkflowRunId,
  ): WorkflowMemoryEntry[] {
    let workspace = this.entriesByWorkspace.get(workspaceId);
    if (!workspace) {
      workspace = new Map<string, WorkflowMemoryEntry[]>();
      this.entriesByWorkspace.set(workspaceId, workspace);
    }
    const runKey = String(workflowRunId);
    let run = workspace.get(runKey);
    if (!run) {
      run = [];
      workspace.set(runKey, run);
    }
    return run;
  }

  private toAppendInput(
    input: WorkflowMemoryAppendInput,
  ): WorkflowMemoryAppendInput {
    if (!input || typeof input !== "object") {
      throw new Error("WorkflowMemoryAppendInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    const workflowRunId = asWorkflowRunId(String(input.workflowRunId));
    this.assertNonEmptyString(input.content, "content");
    if (
      typeof input.kind !== "string" ||
      !(VALID_KINDS as readonly string[]).includes(input.kind)
    ) {
      throw new Error(`Unknown WorkflowMemoryEntryKind: ${String(input.kind)}`);
    }
    return {
      workspaceId: input.workspaceId.trim(),
      workflowRunId,
      kind: input.kind,
      content: input.content,
      ...(input.agentId !== undefined ? { agentId: input.agentId } : {}),
      ...(input.stepId !== undefined ? { stepId: input.stepId } : {}),
      ...(input.handoffKind !== undefined
        ? { handoffKind: input.handoffKind }
        : {}),
    };
  }

  private clone(entry: WorkflowMemoryEntry): WorkflowMemoryEntry {
    return {
      id: entry.id,
      workspaceId: entry.workspaceId,
      workflowRunId: entry.workflowRunId,
      kind: entry.kind,
      content: entry.content,
      sequence: entry.sequence,
      ...(entry.agentId !== undefined ? { agentId: entry.agentId } : {}),
      ...(entry.stepId !== undefined ? { stepId: entry.stepId } : {}),
      ...(entry.handoffKind !== undefined
        ? { handoffKind: entry.handoffKind }
        : {}),
    };
  }

  private assertNonEmptyString(value: unknown, label: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${label} must be a non-empty string`);
    }
  }
}
