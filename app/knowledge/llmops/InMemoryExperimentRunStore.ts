import { asExperimentId, type ExperimentId } from "./ExperimentId";
import { asExperimentRunId, type ExperimentRunId } from "./ExperimentRunId";
import type { ExperimentRunRecord } from "./ExperimentRunRecord";
import type { ExperimentRunStatus } from "./ExperimentRunStatus";
import type {
  ExperimentRunCreateInput,
  ExperimentRunStore,
  ExperimentRunUpdateStatusInput,
} from "./ExperimentRunStore";

const VALID_STATUSES: readonly ExperimentRunStatus[] = [
  "pending",
  "running",
  "completed",
  "failed",
];

/**
 * In-memory {@link ExperimentRunStore}: workspace-scoped Experiment / Run
 * Tracking with defensive copies and cross-workspace isolation.
 *
 * Distinct from Project 2 {@link InMemoryJobStore}. No SQL/Postgres adapter.
 */
export class InMemoryExperimentRunStore implements ExperimentRunStore {
  private readonly runsByWorkspace = new Map<
    string,
    Map<string, ExperimentRunRecord>
  >();

  async create(input: ExperimentRunCreateInput): Promise<ExperimentRunRecord> {
    const validated = this.toCreateInput(input);
    const workspaceRuns = this.getOrCreateWorkspace(validated.workspaceId);
    if (workspaceRuns.has(validated.id)) {
      throw new Error(`Duplicate experiment run id: ${validated.id}`);
    }
    const record: ExperimentRunRecord = {
      id: validated.id,
      experimentId: validated.experimentId,
      workspaceId: validated.workspaceId,
      status: validated.status ?? "pending",
      params: { ...validated.params },
    };
    if (validated.metrics !== undefined) {
      record.metrics = { ...validated.metrics };
    }
    if (validated.startedAtUnixMs !== undefined) {
      record.startedAtUnixMs = validated.startedAtUnixMs;
    }
    if (validated.endedAtUnixMs !== undefined) {
      record.endedAtUnixMs = validated.endedAtUnixMs;
    }
    if (validated.error !== undefined) {
      record.error = validated.error;
    }
    workspaceRuns.set(record.id, this.clone(record));
    return this.clone(record);
  }

  async getById(
    workspaceId: string,
    runId: ExperimentRunId,
  ): Promise<ExperimentRunRecord | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const id = asExperimentRunId(runId);
    const stored = this.runsByWorkspace.get(workspaceId)?.get(id);
    return stored ? this.clone(stored) : null;
  }

  async listByExperiment(
    workspaceId: string,
    experimentId: ExperimentId,
  ): Promise<readonly ExperimentRunRecord[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const expId = asExperimentId(experimentId);
    const workspaceRuns = this.runsByWorkspace.get(workspaceId);
    if (!workspaceRuns || workspaceRuns.size === 0) {
      return [];
    }
    return [...workspaceRuns.values()]
      .filter((run) => run.experimentId === expId)
      .sort((a, b) => {
        const aStart = a.startedAtUnixMs ?? Number.POSITIVE_INFINITY;
        const bStart = b.startedAtUnixMs ?? Number.POSITIVE_INFINITY;
        if (aStart !== bStart) {
          return aStart - bStart;
        }
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      })
      .map((run) => this.clone(run));
  }

  async updateStatus(
    input: ExperimentRunUpdateStatusInput,
  ): Promise<ExperimentRunRecord> {
    if (!input || typeof input !== "object") {
      throw new Error("ExperimentRunUpdateStatusInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    const runId = asExperimentRunId(input.runId);
    this.assertValidStatus(input.status);
    const workspaceRuns = this.runsByWorkspace.get(input.workspaceId);
    const existing = workspaceRuns?.get(runId);
    if (!existing) {
      throw new Error(`Unknown experiment run id: ${runId}`);
    }
    this.assertTransitionAllowed(existing.status, input.status);
    const updated: ExperimentRunRecord = {
      ...this.clone(existing),
      status: input.status,
    };
    if (input.metrics !== undefined) {
      updated.metrics = {
        ...(existing.metrics ?? {}),
        ...input.metrics,
      };
    }
    if (input.error !== undefined) {
      updated.error = input.error;
    }
    if (input.endedAtUnixMs !== undefined) {
      updated.endedAtUnixMs = input.endedAtUnixMs;
    }
    workspaceRuns!.set(runId, this.clone(updated));
    return this.clone(updated);
  }

  private getOrCreateWorkspace(
    workspaceId: string,
  ): Map<string, ExperimentRunRecord> {
    let workspace = this.runsByWorkspace.get(workspaceId);
    if (!workspace) {
      workspace = new Map();
      this.runsByWorkspace.set(workspaceId, workspace);
    }
    return workspace;
  }

  private toCreateInput(input: ExperimentRunCreateInput): ExperimentRunCreateInput {
    if (!input || typeof input !== "object") {
      throw new Error("ExperimentRunCreateInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    const id = asExperimentRunId(input.id);
    const experimentId = asExperimentId(input.experimentId);
    if (input.status !== undefined) {
      this.assertValidStatus(input.status);
    }
    if (!input.params || typeof input.params !== "object") {
      throw new Error("params must be an object");
    }
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(input.params)) {
      if (typeof value !== "string") {
        throw new Error(`params.${key} must be a string`);
      }
      params[key] = value;
    }
    const result: ExperimentRunCreateInput = {
      id,
      experimentId,
      workspaceId: input.workspaceId,
      params,
    };
    if (input.status !== undefined) {
      result.status = input.status;
    }
    if (input.metrics !== undefined) {
      result.metrics = this.copyMetrics(input.metrics);
    }
    if (input.startedAtUnixMs !== undefined) {
      result.startedAtUnixMs = input.startedAtUnixMs;
    }
    if (input.endedAtUnixMs !== undefined) {
      result.endedAtUnixMs = input.endedAtUnixMs;
    }
    if (input.error !== undefined) {
      result.error = input.error;
    }
    return result;
  }

  private assertValidStatus(status: unknown): asserts status is ExperimentRunStatus {
    if (
      typeof status !== "string" ||
      !VALID_STATUSES.includes(status as ExperimentRunStatus)
    ) {
      throw new Error(
        'status must be "pending" | "running" | "completed" | "failed"',
      );
    }
  }

  private assertTransitionAllowed(
    from: ExperimentRunStatus,
    to: ExperimentRunStatus,
  ): void {
    if (from === to) {
      return;
    }
    if (
      (from === "completed" || from === "failed") &&
      (to === "running" || to === "pending")
    ) {
      throw new Error(`Invalid experiment run status transition: ${from} → ${to}`);
    }
    if (from === "pending" && to === "running") {
      return;
    }
    if (from === "pending" && (to === "completed" || to === "failed")) {
      return;
    }
    if (from === "running" && (to === "completed" || to === "failed")) {
      return;
    }
    if (from === "completed" && to === "failed") {
      return;
    }
    if (from === "failed" && to === "completed") {
      return;
    }
    throw new Error(`Invalid experiment run status transition: ${from} → ${to}`);
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${field} must be a non-empty string`);
    }
  }

  private copyMetrics(
    metrics: Readonly<Record<string, number>>,
  ): Record<string, number> {
    const copied: Record<string, number> = {};
    for (const [key, value] of Object.entries(metrics)) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`metrics.${key} must be a finite number`);
      }
      copied[key] = value;
    }
    return copied;
  }

  private clone(record: ExperimentRunRecord): ExperimentRunRecord {
    const cloned: ExperimentRunRecord = {
      id: record.id,
      experimentId: record.experimentId,
      workspaceId: record.workspaceId,
      status: record.status,
      params: { ...record.params },
    };
    if (record.metrics !== undefined) {
      cloned.metrics = { ...record.metrics };
    }
    if (record.startedAtUnixMs !== undefined) {
      cloned.startedAtUnixMs = record.startedAtUnixMs;
    }
    if (record.endedAtUnixMs !== undefined) {
      cloned.endedAtUnixMs = record.endedAtUnixMs;
    }
    if (record.error !== undefined) {
      cloned.error = record.error;
    }
    return cloned;
  }
}

/** Alias matching Default* adapter naming used elsewhere in the repo. */
export { InMemoryExperimentRunStore as DefaultExperimentRunStore };
