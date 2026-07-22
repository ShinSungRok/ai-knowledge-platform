import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";

/**
 * Identity and role metadata for one Multi-Agent workflow participant.
 *
 * `capabilities` are opaque tool/capability name strings — not bound to
 * MCP tool names at the type level in this Sprint.
 */
export interface WorkflowAgentDescriptor {
  id: WorkflowAgentId;
  role: WorkflowAgentRole;
  displayName: string;
  capabilities?: readonly string[];
}
