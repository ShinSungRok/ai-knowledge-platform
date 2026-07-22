import type { WorkflowAgent } from "./WorkflowAgent";
import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";

/**
 * Port for registering and looking up Multi-Agent workflow participants
 * by id and role.
 *
 * Sync `void` / sync returns match the MCP-style in-process registry
 * pattern (no network I/O). WorkflowOrchestrator / handoff remain
 * deferred — this port does not invoke agents.
 */
export interface WorkflowAgentRegistry {
  register(agent: WorkflowAgent): void;
  getById(id: WorkflowAgentId): WorkflowAgent | null;
  listByRole(role: WorkflowAgentRole): readonly WorkflowAgent[];
  listAll(): readonly WorkflowAgent[];
}
