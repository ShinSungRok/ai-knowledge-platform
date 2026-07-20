import type { JobType } from "./JobType";
import type { JobStatus } from "./JobStatus";

/**
 * One workspace-scoped background job record: type, status, attempt
 * budget, and optional failure/result payloads. Handlers execute the
 * underlying pipeline; this record does not embed Domain business logic.
 */
export interface JobRecord {
  id: string;
  workspaceId: string;
  type: JobType;
  status: JobStatus;
  sourceId: string;
  attempts: number;
  maxAttempts: number;
  sequence: number;
  lastError?: string;
  result?: Readonly<Record<string, unknown>>;
}
