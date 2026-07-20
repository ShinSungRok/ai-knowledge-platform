import type { JobRecord } from "./JobRecord";
import type { JobType } from "./JobType";

/**
 * Port for executing one job type against an underlying knowledge
 * pipeline. Handlers return a plain result bag; they do not mutate
 * {@link JobRecord} status/attempts (that is the processor's job).
 */
export interface JobHandler {
  readonly type: JobType;
  execute(job: JobRecord): Promise<Readonly<Record<string, unknown>>>;
}
