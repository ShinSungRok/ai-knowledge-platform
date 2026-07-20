import type { ToolCallResult } from "../tools/ToolCallResult";

/**
 * Result of executing one {@link AgentPlanStep}: the step's own id
 * paired with the unchanged {@link ToolCallResult} from the tool-calling
 * boundary.
 */
export interface AgentStepResult {
  stepId: string;
  toolCall: ToolCallResult;
}
