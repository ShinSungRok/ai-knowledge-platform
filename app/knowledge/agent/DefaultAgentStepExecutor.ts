import type { ToolExecutor } from "../tools/ToolExecutor";
import type { AgentPlanStep } from "./AgentPlanStep";
import type { AgentStepResult } from "./AgentStepResult";
import type { AgentStepExecutor } from "./AgentStepExecutor";

/**
 * Default {@link AgentStepExecutor}: validates a plan step and timeout,
 * then delegates to a {@link ToolExecutor} port and wraps the unchanged
 * {@link ToolCallResult} as an {@link AgentStepResult}.
 *
 * Depends only on the tool-executor port — never on a concrete tools/
 * mcp adapter, LLM provider, repository, or application use case.
 */
export class DefaultAgentStepExecutor implements AgentStepExecutor {
  constructor(private readonly toolExecutor: ToolExecutor) {}

  async executeStep(
    step: AgentPlanStep,
    timeoutMs: number,
  ): Promise<AgentStepResult> {
    const validated = this.toStep(step, timeoutMs);

    const toolCall = await this.toolExecutor.execute({
      name: validated.step.toolName,
      arguments: validated.step.arguments,
      timeoutMs: validated.timeoutMs,
    });

    return {
      stepId: validated.step.id,
      toolCall,
    };
  }

  private toStep(
    step: AgentPlanStep,
    timeoutMs: number,
  ): { step: AgentPlanStep; timeoutMs: number } {
    if (!step || typeof step !== "object") {
      throw new Error("AgentPlanStep must be an object");
    }
    if (typeof step.id !== "string" || step.id.trim().length === 0) {
      throw new Error("AgentPlanStep.id must be a non-empty string");
    }
    if (typeof step.toolName !== "string" || step.toolName.trim().length === 0) {
      throw new Error("AgentPlanStep.toolName must be a non-empty string");
    }
    if (
      !step.arguments ||
      typeof step.arguments !== "object" ||
      Array.isArray(step.arguments)
    ) {
      throw new Error("AgentPlanStep.arguments must be an object");
    }
    if (
      typeof timeoutMs !== "number" ||
      !Number.isInteger(timeoutMs) ||
      timeoutMs <= 0
    ) {
      throw new Error("timeoutMs must be a positive integer");
    }
    return {
      step: {
        id: step.id,
        toolName: step.toolName,
        arguments: step.arguments,
      },
      timeoutMs,
    };
  }
}
