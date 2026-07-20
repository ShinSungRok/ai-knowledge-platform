/**
 * Module: `app/knowledge/agent`
 *
 * Role-separated Agent Orchestration (Planner / Executor / Reviewer)
 * sitting above Tool Calling.
 *
 * `AgentRole`, `AgentGoal`, `AgentPlanStep`, `AgentPlan`,
 * `AgentStepResult`, `AgentReviewDecision`, `AgentReviewResult`,
 * `AgentExecutionStatus`, `AgentRunResult`, and the planner /
 * step-executor / reviewer / orchestrator ports (Task 58) define how
 * a knowledge-aware plan can be produced, executed, and reviewed
 * without Memory, LLM freeform planning, multi-agent collaboration,
 * or composition-root wiring. Concrete adapters are later tasks.
 */
export const KNOWLEDGE_MODULE_AGENT = "app/knowledge/agent" as const;

export type { AgentRole } from "./AgentRole";
export type { AgentGoal } from "./AgentGoal";
export type { AgentPlanStep } from "./AgentPlanStep";
export type { AgentPlan } from "./AgentPlan";
export type { AgentStepResult } from "./AgentStepResult";
export type { AgentReviewDecision } from "./AgentReviewDecision";
export type { AgentReviewResult } from "./AgentReviewResult";
export type { AgentExecutionStatus } from "./AgentExecutionStatus";
export type { AgentRunResult } from "./AgentRunResult";
export type { AgentPlanner } from "./AgentPlanner";
export type { AgentStepExecutor } from "./AgentStepExecutor";
export type { AgentReviewer } from "./AgentReviewer";
export type { AgentOrchestrator } from "./AgentOrchestrator";
