/**
 * Multi-Agent workflow roles (Project 3).
 *
 * These are **not** Project 2 single-agent `AgentRole` values
 * (`"planner" | "executor" | "reviewer"`), which remain internal roles
 * inside `app/knowledge/agent`. Do not conflate or substitute one for
 * the other.
 */
export type WorkflowAgentRole =
  | "coordinator"
  | "researcher"
  | "synthesizer"
  | "critic"
  | "executor";

export const WORKFLOW_AGENT_ROLES: readonly WorkflowAgentRole[] = [
  "coordinator",
  "researcher",
  "synthesizer",
  "critic",
  "executor",
] as const;
