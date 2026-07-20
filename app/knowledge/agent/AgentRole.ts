/**
 * Separated Agent Orchestration roles. Planner, executor, and reviewer
 * responsibilities must not be mixed into a single class.
 */
export type AgentRole = "planner" | "executor" | "reviewer";
