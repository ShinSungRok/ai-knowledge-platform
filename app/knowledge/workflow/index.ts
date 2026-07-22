/**
 * Module: `app/knowledge/workflow`
 *
 * Multi-Agent role/identity contract. WorkflowOrchestrator, Agent
 * Handoff/Delegation, Shared Workflow Memory, and Multi-Agent Evaluation
 * remain deferred.
 *
 * Project 2 `AgentRole` (`planner`|`executor`|`reviewer`) stays the
 * single-agent internal role set under `app/knowledge/agent` and must
 * not be conflated with {@link WorkflowAgentRole}.
 */
export const KNOWLEDGE_MODULE_WORKFLOW = "app/knowledge/workflow" as const;

export type { WorkflowAgentId } from "./WorkflowAgentId";
export { asWorkflowAgentId } from "./WorkflowAgentId";
export type { WorkflowAgentRole } from "./WorkflowAgentRole";
export { WORKFLOW_AGENT_ROLES } from "./WorkflowAgentRole";
export type { WorkflowAgentDescriptor } from "./WorkflowAgentDescriptor";
export type { WorkflowAgent } from "./WorkflowAgent";
