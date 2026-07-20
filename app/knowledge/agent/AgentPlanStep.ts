/**
 * A single planned tool invocation within an {@link AgentPlan}: stable
 * step id, tool name, and free-form argument bag. Argument shape
 * validation belongs to the tool-calling boundary, not this plan type.
 */
export interface AgentPlanStep {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
}
