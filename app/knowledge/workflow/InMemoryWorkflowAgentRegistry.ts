import type { WorkflowAgent } from "./WorkflowAgent";
import type { WorkflowAgentDescriptor } from "./WorkflowAgentDescriptor";
import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowAgentRegistry } from "./WorkflowAgentRegistry";
import {
  WORKFLOW_AGENT_ROLES,
  type WorkflowAgentRole,
} from "./WorkflowAgentRole";

const ROLE_SET = new Set<string>(WORKFLOW_AGENT_ROLES);

/**
 * In-memory {@link WorkflowAgentRegistry}: registers Multi-Agent
 * descriptors by id, rejects duplicates and empty id/displayName,
 * and returns defensive copies on list reads.
 *
 * Does not invoke agents or wire WorkflowOrchestrator.
 */
export class InMemoryWorkflowAgentRegistry implements WorkflowAgentRegistry {
  private readonly agentsById = new Map<string, WorkflowAgent>();

  register(agent: WorkflowAgent): void {
    if (!agent || typeof agent !== "object") {
      throw new Error("WorkflowAgent must be an object");
    }
    const descriptor = this.cloneDescriptor(agent.descriptor);
    const id = descriptor.id;
    if (this.agentsById.has(id)) {
      throw new Error(`Duplicate workflow agent id: ${id}`);
    }
    this.agentsById.set(id, { descriptor });
  }

  getById(id: WorkflowAgentId): WorkflowAgent | null {
    this.assertNonEmptyString(id, "WorkflowAgentId");
    const agent = this.agentsById.get(id);
    if (!agent) {
      return null;
    }
    return this.cloneAgent(agent);
  }

  listByRole(role: WorkflowAgentRole): readonly WorkflowAgent[] {
    this.assertValidRole(role);
    return [...this.agentsById.values()]
      .filter((agent) => agent.descriptor.role === role)
      .map((agent) => this.cloneAgent(agent));
  }

  listAll(): readonly WorkflowAgent[] {
    return [...this.agentsById.values()].map((agent) => this.cloneAgent(agent));
  }

  private cloneAgent(agent: WorkflowAgent): WorkflowAgent {
    return { descriptor: this.cloneDescriptor(agent.descriptor) };
  }

  private cloneDescriptor(
    descriptor: WorkflowAgentDescriptor,
  ): WorkflowAgentDescriptor {
    if (!descriptor || typeof descriptor !== "object") {
      throw new Error("WorkflowAgentDescriptor must be an object");
    }
    this.assertNonEmptyString(descriptor.id, "WorkflowAgentDescriptor.id");
    this.assertNonEmptyString(
      descriptor.displayName,
      "WorkflowAgentDescriptor.displayName",
    );
    this.assertValidRole(descriptor.role);
    const cloned: WorkflowAgentDescriptor = {
      id: descriptor.id,
      role: descriptor.role,
      displayName: descriptor.displayName,
    };
    if (descriptor.capabilities !== undefined) {
      if (!Array.isArray(descriptor.capabilities)) {
        throw new Error(
          "WorkflowAgentDescriptor.capabilities must be an array when present",
        );
      }
      for (const capability of descriptor.capabilities) {
        if (typeof capability !== "string") {
          throw new Error(
            "WorkflowAgentDescriptor.capabilities entries must be strings",
          );
        }
      }
      cloned.capabilities = [...descriptor.capabilities];
    }
    return cloned;
  }

  private assertValidRole(role: WorkflowAgentRole): void {
    if (typeof role !== "string" || !ROLE_SET.has(role)) {
      throw new Error(`Unknown WorkflowAgentRole: ${String(role)}`);
    }
  }

  private assertNonEmptyString(value: unknown, label: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${label} must be a non-empty string`);
    }
  }
}

/** Alias matching MCP `Default*` registry naming where preferred. */
export { InMemoryWorkflowAgentRegistry as DefaultWorkflowAgentRegistry };
