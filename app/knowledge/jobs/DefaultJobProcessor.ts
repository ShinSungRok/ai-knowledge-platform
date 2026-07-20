import type { JobHandler } from "./JobHandler";
import type { JobProcessor } from "./JobProcessor";
import type { JobRecord } from "./JobRecord";
import type { JobStore } from "./JobStore";

/**
 * Default {@link JobProcessor}: picks the oldest pending job in a
 * workspace, marks it running, invokes a matching {@link JobHandler},
 * and applies completed/failed/retry transitions.
 *
 * Constructor injects only {@link JobStore} and a readonly handler
 * array — duplicate handler types throw at construction.
 */
export class DefaultJobProcessor implements JobProcessor {
  private readonly handlersByType: Map<string, JobHandler>;

  constructor(
    private readonly jobStore: JobStore,
    handlers: readonly JobHandler[],
  ) {
    this.handlersByType = new Map();
    for (const handler of handlers) {
      if (this.handlersByType.has(handler.type)) {
        throw new Error(`Duplicate job handler type: ${handler.type}`);
      }
      this.handlersByType.set(handler.type, handler);
    }
  }

  async processNext(workspaceId: string): Promise<JobRecord | null> {
    this.assertWorkspaceId(workspaceId);

    const jobs = await this.jobStore.listByWorkspace(workspaceId);
    const pending = jobs
      .filter((job) => job.status === "pending")
      .sort((a, b) => a.sequence - b.sequence)[0];
    if (!pending) {
      return null;
    }

    const running = await this.jobStore.save({
      ...this.cloneWithoutOptional(pending),
      status: "running",
      ...(pending.lastError !== undefined
        ? { lastError: pending.lastError }
        : {}),
      ...(pending.result !== undefined ? { result: pending.result } : {}),
    });

    const handler = this.handlersByType.get(running.type);
    if (!handler) {
      return this.jobStore.save({
        ...this.cloneWithoutOptional(running),
        attempts: running.attempts + 1,
        status: "failed",
        lastError: `No handler for job type: ${running.type}`,
      });
    }

    try {
      const result = await handler.execute(running);
      return this.jobStore.save({
        ...this.cloneWithoutOptional(running),
        attempts: running.attempts + 1,
        status: "completed",
        result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attempts = running.attempts + 1;
      const status = attempts < running.maxAttempts ? "pending" : "failed";
      return this.jobStore.save({
        ...this.cloneWithoutOptional(running),
        attempts,
        status,
        lastError: message,
      });
    }
  }

  private cloneWithoutOptional(job: JobRecord): Omit<
    JobRecord,
    "lastError" | "result"
  > {
    return {
      id: job.id,
      workspaceId: job.workspaceId,
      type: job.type,
      status: job.status,
      sourceId: job.sourceId,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      sequence: job.sequence,
    };
  }

  private assertWorkspaceId(workspaceId: string): void {
    if (typeof workspaceId !== "string" || workspaceId.trim().length === 0) {
      throw new Error("workspaceId must be a non-empty string");
    }
  }
}
