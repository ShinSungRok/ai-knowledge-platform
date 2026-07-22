/**
 * Module: `app/knowledge/llmops`
 *
 * Project 4 Enterprise LLMOps boundary. This Sprint establishes
 * **Experiment / Run Tracking** only — experiment/run identifiers, records,
 * and the {@link ExperimentRunStore} port.
 *
 * Deferred (do not implement here): Prompt & Model Registry, Evaluation
 * Gates / Regression Harness, Deployment / Serving Configuration, LLMOps
 * Observability product code.
 *
 * Distinct from Project 2 `JobRecord` / `JobStore` and Project 3
 * `WorkflowRunId` / workflow memory — do not conflate.
 */
export const KNOWLEDGE_MODULE_LLMOPS = "app/knowledge/llmops" as const;

export type { ExperimentId } from "./ExperimentId";
export { asExperimentId } from "./ExperimentId";
export type { ExperimentRunId } from "./ExperimentRunId";
export { asExperimentRunId } from "./ExperimentRunId";
export type { ExperimentRunStatus } from "./ExperimentRunStatus";
export type { ExperimentRunRecord } from "./ExperimentRunRecord";
export type {
  ExperimentRunCreateInput,
  ExperimentRunUpdateStatusInput,
  ExperimentRunStore,
} from "./ExperimentRunStore";
export {
  InMemoryExperimentRunStore,
  DefaultExperimentRunStore,
} from "./InMemoryExperimentRunStore";
