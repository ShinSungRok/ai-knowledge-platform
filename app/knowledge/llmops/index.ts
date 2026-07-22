/**
 * Module: `app/knowledge/llmops`
 *
 * Project 4 Enterprise LLMOps boundary:
 * - **Experiment / Run Tracking** (Partial) — {@link ExperimentRunStore}
 * - **Prompt & Model Registry** (contract this Sprint) — {@link PromptRegistry}
 *   / {@link ModelRegistry}
 *
 * Soft link (document only): experiment run `params` may later store
 * `promptVersionId` / `modelVersionId` without changing ExperimentRunStore.
 *
 * Deferred: Evaluation Gates / Regression Harness, Deployment / Serving
 * Configuration, LLMOps Observability product code. Does not bind
 * `ai` LanguageModelProvider to the registry.
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

export type { PromptTemplateId } from "./PromptTemplateId";
export { asPromptTemplateId } from "./PromptTemplateId";
export type { PromptVersionId } from "./PromptVersionId";
export { asPromptVersionId } from "./PromptVersionId";
export type { PromptTemplateRecord } from "./PromptTemplateRecord";
export type { PromptVersionRecord } from "./PromptVersionRecord";
export type {
  PromptTemplateRegisterInput,
  PromptVersionRegisterInput,
  PromptRegistry,
} from "./PromptRegistry";

export type { ModelId } from "./ModelId";
export { asModelId } from "./ModelId";
export type { ModelVersionId } from "./ModelVersionId";
export { asModelVersionId } from "./ModelVersionId";
export type { ModelRecord } from "./ModelRecord";
export type { ModelVersionRecord } from "./ModelVersionRecord";
export type {
  ModelRegisterInput,
  ModelVersionRegisterInput,
  ModelRegistry,
} from "./ModelRegistry";
