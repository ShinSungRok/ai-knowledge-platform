import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowAgentInvokeInput } from "./WorkflowAgentInvokeInput";
import type { WorkflowAgentInvokeResult } from "./WorkflowAgentInvokeResult";
import type { WorkflowAgentInvoker } from "./WorkflowAgentInvoker";

export type FakeWorkflowAgentInvokerHandler = (
  input: WorkflowAgentInvokeInput,
) => Promise<WorkflowAgentInvokeResult> | WorkflowAgentInvokeResult;

export interface FakeWorkflowAgentInvokerOptions {
  /**
   * Optional per-agent handlers. When absent for an agentId, returns a
   * deterministic success: `echo:${role}:${input}`.
   */
  handlers?: ReadonlyMap<
    WorkflowAgentId | string,
    FakeWorkflowAgentInvokerHandler
  >;
  /**
   * Agent ids that should fail with `ok: false` when no custom handler
   * overrides them.
   */
  failingAgentIds?: ReadonlySet<WorkflowAgentId | string>;
}

/**
 * Fake {@link WorkflowAgentInvoker} for dependency-free validation.
 *
 * Records every invoke call, supports per-agent handlers and configured
 * failures, and otherwise echoes `echo:${role}:${input}`.
 */
export class FakeWorkflowAgentInvoker implements WorkflowAgentInvoker {
  readonly calls: WorkflowAgentInvokeInput[] = [];

  private readonly handlers: Map<string, FakeWorkflowAgentInvokerHandler>;
  private readonly failingAgentIds: Set<string>;

  constructor(options: FakeWorkflowAgentInvokerOptions = {}) {
    this.handlers = new Map();
    if (options.handlers) {
      for (const [id, handler] of options.handlers) {
        this.handlers.set(String(id), handler);
      }
    }
    this.failingAgentIds = new Set(
      [...(options.failingAgentIds ?? [])].map((id) => String(id)),
    );
  }

  async invoke(
    input: WorkflowAgentInvokeInput,
  ): Promise<WorkflowAgentInvokeResult> {
    if (!input || typeof input !== "object") {
      throw new Error("WorkflowAgentInvokeInput must be an object");
    }
    this.calls.push({ ...input });

    const agentKey = String(input.agentId);
    const handler = this.handlers.get(agentKey);
    if (handler) {
      return handler(input);
    }

    if (this.failingAgentIds.has(agentKey)) {
      return {
        ok: false,
        output: "",
        error: `FakeWorkflowAgentInvoker configured failure for ${agentKey}`,
      };
    }

    return {
      ok: true,
      output: `echo:${input.role}:${input.input}`,
    };
  }
}
