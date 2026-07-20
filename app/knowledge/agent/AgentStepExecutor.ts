import type { AgentPlanStep } from "./AgentPlanStep";
import type { AgentStepResult } from "./AgentStepResult";

/**
 * Port for executing a single {@link AgentPlanStep} with a timeout
 * budget, returning an {@link AgentStepResult}. Concrete adapters
 * should delegate to the tool-calling boundary rather than duplicating
 * Domain/RAG business logic.
 */
export interface AgentStepExecutor {
  executeStep(step: AgentPlanStep, timeoutMs: number): Promise<AgentStepResult>;
}
