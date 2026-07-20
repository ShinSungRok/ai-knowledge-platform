import type { JobEnqueueInput } from "./JobStore";
import type { JobRecord } from "./JobRecord";
import type { JobStore } from "./JobStore";
import type { JobType } from "./JobType";

const VALID_TYPES: readonly JobType[] = [
  "sync_knowledge_source",
  "reindex_knowledge_source",
];

/**
 * In-memory {@link JobStore} adapter: workspace-scoped job enqueue,
 * lookup, listing, and save with deterministic ids and sequence ordering.
 */
export class InMemoryJobStore implements JobStore {
  private readonly jobsByWorkspace = new Map<string, JobRecord[]>();

  async enqueue(input: JobEnqueueInput): Promise<JobRecord> {
    const validated = this.toEnqueueInput(input);
    const workspaceJobs = this.getOrCreateWorkspace(validated.workspaceId);
    const sequence = workspaceJobs.length + 1;
    const job: JobRecord = {
      id: `${validated.workspaceId}:${sequence}`,
      workspaceId: validated.workspaceId,
      type: validated.type,
      status: "pending",
      sourceId: validated.sourceId,
      attempts: 0,
      maxAttempts: validated.maxAttempts,
      sequence,
    };
    workspaceJobs.push(this.clone(job));
    return this.clone(job);
  }

  async getById(workspaceId: string, jobId: string): Promise<JobRecord | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(jobId, "jobId");
    const stored = this.jobsByWorkspace
      .get(workspaceId)
      ?.find((job) => job.id === jobId);
    return stored ? this.clone(stored) : null;
  }

  async listByWorkspace(workspaceId: string): Promise<JobRecord[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const workspaceJobs = this.jobsByWorkspace.get(workspaceId);
    if (!workspaceJobs || workspaceJobs.length === 0) {
      return [];
    }
    return workspaceJobs
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((job) => this.clone(job));
  }

  async save(job: JobRecord): Promise<JobRecord> {
    if (!job || typeof job !== "object") {
      throw new Error("JobRecord must be an object");
    }
    this.assertNonEmptyString(job.workspaceId, "workspaceId");
    this.assertNonEmptyString(job.id, "id");
    const workspaceJobs = this.jobsByWorkspace.get(job.workspaceId);
    if (!workspaceJobs) {
      throw new Error(`Unknown job id: ${job.id}`);
    }
    const index = workspaceJobs.findIndex((stored) => stored.id === job.id);
    if (index < 0) {
      throw new Error(`Unknown job id: ${job.id}`);
    }
    const cloned = this.clone(job);
    workspaceJobs[index] = cloned;
    return this.clone(cloned);
  }

  private getOrCreateWorkspace(workspaceId: string): JobRecord[] {
    let workspace = this.jobsByWorkspace.get(workspaceId);
    if (!workspace) {
      workspace = [];
      this.jobsByWorkspace.set(workspaceId, workspace);
    }
    return workspace;
  }

  private toEnqueueInput(input: JobEnqueueInput): JobEnqueueInput {
    if (!input || typeof input !== "object") {
      throw new Error("JobEnqueueInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    this.assertNonEmptyString(input.sourceId, "sourceId");
    if (
      typeof input.type !== "string" ||
      !VALID_TYPES.includes(input.type as JobType)
    ) {
      throw new Error(
        'JobEnqueueInput.type must be "sync_knowledge_source" | "reindex_knowledge_source"',
      );
    }
    if (
      typeof input.maxAttempts !== "number" ||
      !Number.isInteger(input.maxAttempts) ||
      input.maxAttempts <= 0
    ) {
      throw new Error("JobEnqueueInput.maxAttempts must be a positive integer");
    }
    return {
      workspaceId: input.workspaceId,
      type: input.type,
      sourceId: input.sourceId,
      maxAttempts: input.maxAttempts,
    };
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${field} must be a non-empty string`);
    }
  }

  private clone(job: JobRecord): JobRecord {
    const cloned: JobRecord = {
      id: job.id,
      workspaceId: job.workspaceId,
      type: job.type,
      status: job.status,
      sourceId: job.sourceId,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      sequence: job.sequence,
    };
    if (job.lastError !== undefined) {
      cloned.lastError = job.lastError;
    }
    if (job.result !== undefined) {
      cloned.result = { ...job.result };
    }
    return cloned;
  }
}
