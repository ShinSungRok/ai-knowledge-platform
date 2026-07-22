import type { ExperimentId } from "./ExperimentId";
import type { ExperimentRunId } from "./ExperimentRunId";
import type { ExperimentRunRecord } from "./ExperimentRunRecord";
import type { ExperimentRunStatus } from "./ExperimentRunStatus";

/**
 * Input for creating one experiment run. Caller supplies `id`; the store
 * validates uniqueness within the workspace.
 */
export interface ExperimentRunCreateInput {
  id: ExperimentRunId;
  experimentId: ExperimentId;
  workspaceId: string;
  status?: ExperimentRunStatus;
  params: Readonly<Record<string, string>>;
  metrics?: Readonly<Record<string, number>>;
  startedAtUnixMs?: number;
  endedAtUnixMs?: number;
  error?: string;
}

/**
 * Input for updating an experiment run's status (and optional terminal
 * fields).
 */
export interface ExperimentRunUpdateStatusInput {
  workspaceId: string;
  runId: ExperimentRunId;
  status: ExperimentRunStatus;
  metrics?: Readonly<Record<string, number>>;
  error?: string;
  endedAtUnixMs?: number;
}

/**
 * Port for workspace-scoped Experiment / Run Tracking persistence.
 *
 * Tracks experiment runs only — Prompt/Model Registry, Evaluation Gates,
 * Serving Configuration, and LLMOps Observability are deferred.
 * Does not replace Project 2 {@link JobStore} or Project 3 workflow memory.
 */
export interface ExperimentRunStore {
  create(input: ExperimentRunCreateInput): Promise<ExperimentRunRecord>;
  getById(
    workspaceId: string,
    runId: ExperimentRunId,
  ): Promise<ExperimentRunRecord | null>;
  listByExperiment(
    workspaceId: string,
    experimentId: ExperimentId,
  ): Promise<readonly ExperimentRunRecord[]>;
  updateStatus(
    input: ExperimentRunUpdateStatusInput,
  ): Promise<ExperimentRunRecord>;
}
