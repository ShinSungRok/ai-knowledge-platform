/**
 * Module: `app/knowledge/jobs`
 *
 * Background Job boundary for long-running Sync/Reindex pipeline work —
 * dependency-free job records, store, handler, and processor ports.
 *
 * Jobs do **not** duplicate Domain business logic; handlers delegate to
 * existing pipelines. `JobType`, `JobStatus`, `JobRecord`, and the
 * `JobStore` / `JobHandler` / `JobProcessor` ports (Task 66) define the
 * contract; concrete adapters and application use cases are later tasks.
 * `InMemoryJobStore` (Task 67) is the first concrete store adapter.
 */
export const KNOWLEDGE_MODULE_JOBS = "app/knowledge/jobs" as const;

export type { JobType } from "./JobType";
export type { JobStatus } from "./JobStatus";
export type { JobRecord } from "./JobRecord";
export type { JobStore, JobEnqueueInput } from "./JobStore";
export type { JobHandler } from "./JobHandler";
export type { JobProcessor } from "./JobProcessor";
export { InMemoryJobStore } from "./InMemoryJobStore";
export { SyncKnowledgeSourceJobHandler } from "./SyncKnowledgeSourceJobHandler";
export { DefaultJobProcessor } from "./DefaultJobProcessor";
export { ReindexKnowledgeSourceJobHandler } from "./ReindexKnowledgeSourceJobHandler";
