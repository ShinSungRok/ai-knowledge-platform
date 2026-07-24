/**
 * Module: `app/knowledge/workflow`
 *
 * Multi-Agent role/identity, Workflow Orchestrator, Agent Handoff /
 * Delegation, Shared Workflow Memory, and Multi-Agent Evaluation
 * contract ({@link WorkflowRunEvaluator}). LLM-as-judge remains deferred.
 *
 * Shared Workflow Memory is **not** Project 2 session `MemoryStore` and
 * is unrelated to Knowledge search. Workflow evaluation is **not** Project 2
 * RAG evaluation under `app/knowledge/evaluation`.
 *
 * Project 2 `AgentRole` (`planner`|`executor`|`reviewer`) stays the
 * single-agent internal role set under `app/knowledge/agent` and must
 * not be conflated with {@link WorkflowAgentRole}.
 * {@link WorkflowAgent} remains identity-only (no `run` on the agent).
 */
export const KNOWLEDGE_MODULE_WORKFLOW = "app/knowledge/workflow" as const;

export type { WorkflowAgentId } from "./WorkflowAgentId";
export { asWorkflowAgentId } from "./WorkflowAgentId";
export type { WorkflowAgentRole } from "./WorkflowAgentRole";
export { WORKFLOW_AGENT_ROLES } from "./WorkflowAgentRole";
export type { WorkflowAgentDescriptor } from "./WorkflowAgentDescriptor";
export type { WorkflowAgent } from "./WorkflowAgent";
export type { WorkflowAgentRegistry } from "./WorkflowAgentRegistry";
export {
  InMemoryWorkflowAgentRegistry,
  DefaultWorkflowAgentRegistry,
} from "./InMemoryWorkflowAgentRegistry";
export type { WorkflowGoal } from "./WorkflowGoal";
export type { WorkflowStepId } from "./WorkflowStepId";
export type { WorkflowPlanStep } from "./WorkflowPlanStep";
export type { WorkflowPlan } from "./WorkflowPlan";
export type { WorkflowStepStatus } from "./WorkflowStepStatus";
export type { WorkflowStepResult } from "./WorkflowStepResult";
export type { WorkflowRunStatus } from "./WorkflowRunStatus";
export type { WorkflowRunResult } from "./WorkflowRunResult";
export type { WorkflowPlanner } from "./WorkflowPlanner";
export type { WorkflowOrchestrator } from "./WorkflowOrchestrator";
export type { WorkflowAgentInvokeInput } from "./WorkflowAgentInvokeInput";
export type { WorkflowAgentInvokeResult } from "./WorkflowAgentInvokeResult";
export type { WorkflowAgentInvoker } from "./WorkflowAgentInvoker";
export { FakeWorkflowAgentInvoker } from "./FakeWorkflowAgentInvoker";
export type {
  FakeWorkflowAgentInvokerHandler,
  FakeWorkflowAgentInvokerOptions,
} from "./FakeWorkflowAgentInvoker";
export type { WorkflowKnowledgeAnswerPort } from "./WorkflowKnowledgeAnswerPort";
export {
  KnowledgeAnswerWorkflowAgentInvoker,
  type KnowledgeAnswerWorkflowAgentInvokerOptions,
} from "./KnowledgeAnswerWorkflowAgentInvoker";
export {
  LanguageModelWorkflowAgentInvoker,
  type LanguageModelWorkflowAgentInvokerOptions,
} from "./LanguageModelWorkflowAgentInvoker";
export { DeterministicWorkflowPlanner } from "./DeterministicWorkflowPlanner";
export { DefaultWorkflowOrchestrator } from "./DefaultWorkflowOrchestrator";
export type { WorkflowHandoffKind } from "./WorkflowHandoffKind";
export type { WorkflowHandoff } from "./WorkflowHandoff";
export type {
  WorkflowHandoffBuildInput,
  WorkflowHandoffBuilder,
} from "./WorkflowHandoffBuilder";
export { DefaultWorkflowHandoffBuilder } from "./DefaultWorkflowHandoffBuilder";
export type { WorkflowRunId } from "./WorkflowRunId";
export { asWorkflowRunId } from "./WorkflowRunId";
export type { WorkflowMemoryEntryKind } from "./WorkflowMemoryEntryKind";
export type { WorkflowMemoryEntry } from "./WorkflowMemoryEntry";
export type { WorkflowMemoryAppendInput } from "./WorkflowMemoryAppendInput";
export type { WorkflowMemoryStore } from "./WorkflowMemoryStore";
export { InMemoryWorkflowMemoryStore } from "./InMemoryWorkflowMemoryStore";
export type { WorkflowEvaluationCase } from "./WorkflowEvaluationCase";
export type { WorkflowEvaluationDataset } from "./WorkflowEvaluationDataset";
export type { WorkflowCaseScore } from "./WorkflowCaseScore";
export type { WorkflowEvaluationMetrics } from "./WorkflowEvaluationMetrics";
export type {
  WorkflowRunEvaluatorInput,
  WorkflowRunEvaluator,
} from "./WorkflowRunEvaluator";
export { DefaultWorkflowRunEvaluator } from "./DefaultWorkflowRunEvaluator";
