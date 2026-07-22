import type { WorkflowAgentInvokeInput } from "./WorkflowAgentInvokeInput";
import type { WorkflowAgentInvokeResult } from "./WorkflowAgentInvokeResult";

/**
 * Port for executing one Multi-Agent step against an identity-only
 * {@link WorkflowAgent}. Keeps `run` off the agent port.
 *
 * Concrete adapters must not import Official SDKs or open network
 * sockets; Fake adapters prove the boundary for validation.
 */
export interface WorkflowAgentInvoker {
  invoke(input: WorkflowAgentInvokeInput): Promise<WorkflowAgentInvokeResult>;
}
