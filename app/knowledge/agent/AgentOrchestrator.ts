import type { AgentGoal } from "./AgentGoal";
import type { AgentRunResult } from "./AgentRunResult";

/**
 * Port for running a full Agent orchestration: plan → execute steps →
 * review → derive status. Concrete adapters must compose planner,
 * step-executor, and reviewer ports rather than mixing those roles
 * into one class's business logic.
 */
export interface AgentOrchestrator {
  run(goal: AgentGoal): Promise<AgentRunResult>;
}
