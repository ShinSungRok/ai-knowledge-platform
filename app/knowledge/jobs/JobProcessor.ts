import type { JobRecord } from "./JobRecord";

/**
 * Port for processing the next pending job in a workspace: select,
 * transition status, invoke a matching handler, and apply retry/failure
 * rules. Concrete adapters must not introduce real workers, cron, or
 * network brokers in this phase.
 */
export interface JobProcessor {
  processNext(workspaceId: string): Promise<JobRecord | null>;
}
