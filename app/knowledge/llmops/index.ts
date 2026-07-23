/**
 * Module: `app/knowledge/llmops`
 *
 * Project 4 Enterprise LLMOps boundary:
 * - **Experiment / Run Tracking** (Partial) — {@link ExperimentRunStore}
 * - **Prompt & Model Registry** (Partial) — {@link PromptRegistry} /
 *   {@link ModelRegistry}
 * - **Evaluation Gates / Regression Harness** (Partial) —
 *   {@link EvaluationGateEvaluator} / {@link RegressionHarness}
 * - **Deployment / Serving Configuration** (contract) —
 *   {@link ServingConfigStore}
 *
 * Soft links (document only):
 * - Run `params` may store `promptVersionId` / `modelVersionId`
 * - Gate input metrics may come from {@link ExperimentRunRecord.metrics} or
 *   flattened evaluation aggregates — do not import evaluation types here
 * - Serving config holds soft-link ids only (no registry/gate calls on activate)
 *
 * Deferred: LLMOps Observability, HTTP serving (Express/Fastify), LLM-as-judge.
 * Does not bind `ai` LanguageModelProvider to the registry or serving config.
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
export {
  InMemoryPromptRegistry,
  DefaultPromptRegistry,
} from "./InMemoryPromptRegistry";
export {
  InMemoryModelRegistry,
  DefaultModelRegistry,
} from "./InMemoryModelRegistry";

export type { EvaluationGateId } from "./EvaluationGateId";
export { asEvaluationGateId } from "./EvaluationGateId";
export type { EvaluationGateComparator } from "./EvaluationGateComparator";
export type { EvaluationGateRule } from "./EvaluationGateRule";
export type { EvaluationGateDefinition } from "./EvaluationGateDefinition";
export type { EvaluationGateRuleResult } from "./EvaluationGateRuleResult";
export type { EvaluationGateResult } from "./EvaluationGateResult";
export type { RegressionMetricRegression } from "./RegressionMetricRegression";
export type { RegressionHarnessResult } from "./RegressionHarnessResult";
export type {
  EvaluationGateEvaluatorInput,
  EvaluationGateEvaluator,
} from "./EvaluationGateEvaluator";
export type {
  RegressionHarnessInput,
  RegressionHarness,
} from "./RegressionHarness";
export { DefaultEvaluationGateEvaluator } from "./DefaultEvaluationGateEvaluator";
export { DefaultRegressionHarness } from "./DefaultRegressionHarness";

export type { ServingConfigId } from "./ServingConfigId";
export { asServingConfigId } from "./ServingConfigId";
export type { ServingEnvironment } from "./ServingEnvironment";
export type { ServingConfigStatus } from "./ServingConfigStatus";
export type { ServingConfigurationRecord } from "./ServingConfigurationRecord";
export type {
  ServingConfigRegisterInput,
  ServingConfigActivateInput,
  ServingConfigRetireInput,
  ServingConfigStore,
} from "./ServingConfigStore";
