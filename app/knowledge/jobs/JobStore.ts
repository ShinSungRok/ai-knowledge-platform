import type { JobRecord } from "./JobRecord";
import type { JobType } from "./JobType";

/**
 * Input for enqueueing one background job into a workspace queue.
 */
export interface JobEnqueueInput {
  workspaceId: string;
  type: JobType;
  sourceId: string;
  maxAttempts: number;
}

/**
 * Port for workspace-scoped background job persistence.
 *
 * Stores job records for Sync/Reindex pipeline work. Does not run
 * handlers or own Domain business logic — those belong to JobHandler /
 * pipeline modules.
 */
export interface JobStore {
  enqueue(input: JobEnqueueInput): Promise<JobRecord>;
  getById(workspaceId: string, jobId: string): Promise<JobRecord | null>;
  listByWorkspace(workspaceId: string): Promise<JobRecord[]>;
  save(job: JobRecord): Promise<JobRecord>;
}
