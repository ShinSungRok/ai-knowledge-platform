import type { JobStore } from "../jobs/JobStore";
import type { JobRecord } from "../jobs/JobRecord";
import type { JobType } from "../jobs/JobType";

const VALID_TYPES: readonly JobType[] = [
  "sync_knowledge_source",
  "reindex_knowledge_source",
];

/**
 * Input for enqueueing a background job at the application boundary.
 */
export interface EnqueueJobInput {
  workspaceId: string;
  type: JobType;
  sourceId: string;
  maxAttempts: number;
}

/**
 * Enqueue-job use case: validate input, then delegate to {@link JobStore}
 * and return the {@link JobRecord} unchanged.
 *
 * Depends only on the job-store port.
 */
export class EnqueueJobUseCase {
  constructor(private readonly jobStore: JobStore) {}

  async execute(input: EnqueueJobInput): Promise<JobRecord> {
    const validated = this.toInput(input);
    return this.jobStore.enqueue({
      workspaceId: validated.workspaceId,
      type: validated.type,
      sourceId: validated.sourceId,
      maxAttempts: validated.maxAttempts,
    });
  }

  private toInput(input: EnqueueJobInput): EnqueueJobInput {
    if (!input || typeof input !== "object") {
      throw new Error("EnqueueJobInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error("EnqueueJobInput.workspaceId must be a non-empty string");
    }
    if (
      typeof input.sourceId !== "string" ||
      input.sourceId.trim().length === 0
    ) {
      throw new Error("EnqueueJobInput.sourceId must be a non-empty string");
    }
    if (
      typeof input.type !== "string" ||
      !VALID_TYPES.includes(input.type as JobType)
    ) {
      throw new Error(
        'EnqueueJobInput.type must be "sync_knowledge_source" | "reindex_knowledge_source"',
      );
    }
    if (
      typeof input.maxAttempts !== "number" ||
      !Number.isInteger(input.maxAttempts) ||
      input.maxAttempts <= 0
    ) {
      throw new Error("EnqueueJobInput.maxAttempts must be a positive integer");
    }
    return {
      workspaceId: input.workspaceId,
      type: input.type,
      sourceId: input.sourceId,
      maxAttempts: input.maxAttempts,
    };
  }
}
