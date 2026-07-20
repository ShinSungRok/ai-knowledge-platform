import type { JobProcessor } from "../jobs/JobProcessor";
import type { JobRecord } from "../jobs/JobRecord";

/**
 * Input for processing the next pending job at the application boundary.
 */
export interface ProcessNextJobInput {
  workspaceId: string;
}

/**
 * Process-next-job use case: validate input, then delegate to
 * {@link JobProcessor} and return `JobRecord | null` unchanged.
 *
 * Depends only on the job-processor port.
 */
export class ProcessNextJobUseCase {
  constructor(private readonly jobProcessor: JobProcessor) {}

  async execute(input: ProcessNextJobInput): Promise<JobRecord | null> {
    const validated = this.toInput(input);
    return this.jobProcessor.processNext(validated.workspaceId);
  }

  private toInput(input: ProcessNextJobInput): ProcessNextJobInput {
    if (!input || typeof input !== "object") {
      throw new Error("ProcessNextJobInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "ProcessNextJobInput.workspaceId must be a non-empty string",
      );
    }
    return { workspaceId: input.workspaceId };
  }
}
