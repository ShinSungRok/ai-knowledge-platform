import type { ExperimentId } from "./ExperimentId";
import type { ExperimentRunId } from "./ExperimentRunId";
import type { ExperimentRunStatus } from "./ExperimentRunStatus";

/**
 * One workspace-scoped experiment run record: opaque params, optional
 * metrics, and lifecycle timestamps. Distinct from Project 2
 * {@link JobRecord} and Project 3 workflow run results.
 */
export interface ExperimentRunRecord {
  id: ExperimentRunId;
  experimentId: ExperimentId;
  workspaceId: string;
  status: ExperimentRunStatus;
  params: Readonly<Record<string, string>>;
  metrics?: Readonly<Record<string, number>>;
  startedAtUnixMs?: number;
  endedAtUnixMs?: number;
  error?: string;
}
