/**
 * Module: `app/knowledge/workflow`
 *
 * Multi-Agent role/identity contract plus Workflow Orchestrator
 * boundary (goal → plan → agent invoke → result). Explicit Agent
 * Handoff/Delegation, Shared Workflow Memory, and Multi-Agent
 * Evaluation remain deferred.
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
