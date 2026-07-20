import type { AgentOrchestrator } from "../agent/AgentOrchestrator";
import type { AgentRunResult } from "../agent/AgentRunResult";

/**
 * Input for running a knowledge-aware Agent from the application
 * boundary. Field shape matches {@link AgentGoal}; kept as its own
 * type so this use case owns validation at the application boundary
 * rather than reusing the agent module's goal type as the input
 * contract directly.
 */
export interface RunAgentInput {
  workspaceId: string;
  query: string;
  retrievalLimit: number;
  maxCharacters: number;
  toolTimeoutMs: number;
}

/**
 * Run-agent use case: validate an Agent goal at the application
 * boundary, then delegate to an {@link AgentOrchestrator} port and
 * return its {@link AgentRunResult} unchanged.
 *
 * Depends only on the orchestrator port — never on concrete planner/
 * step-executor/reviewer adapters, a tool-calling executor, LLM, or
 * repository. Invalid input throws without calling the orchestrator.
 */
export class RunAgentUseCase {
  constructor(private readonly agentOrchestrator: AgentOrchestrator) {}

  async execute(input: RunAgentInput): Promise<AgentRunResult> {
    const validated = this.toInput(input);

    return this.agentOrchestrator.run({
      workspaceId: validated.workspaceId,
      query: validated.query,
      retrievalLimit: validated.retrievalLimit,
      maxCharacters: validated.maxCharacters,
      toolTimeoutMs: validated.toolTimeoutMs,
    });
  }

  private toInput(input: RunAgentInput): RunAgentInput {
    if (!input || typeof input !== "object") {
      throw new Error("RunAgentInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error("RunAgentInput.workspaceId must be a non-empty string");
    }
    if (typeof input.query !== "string" || input.query.trim().length === 0) {
      throw new Error("RunAgentInput.query must be a non-empty string");
    }
    if (
      typeof input.retrievalLimit !== "number" ||
      !Number.isInteger(input.retrievalLimit) ||
      input.retrievalLimit <= 0
    ) {
      throw new Error("RunAgentInput.retrievalLimit must be a positive integer");
    }
    if (
      typeof input.maxCharacters !== "number" ||
      !Number.isInteger(input.maxCharacters) ||
      input.maxCharacters <= 0
    ) {
      throw new Error("RunAgentInput.maxCharacters must be a positive integer");
    }
    if (
      typeof input.toolTimeoutMs !== "number" ||
      !Number.isInteger(input.toolTimeoutMs) ||
      input.toolTimeoutMs <= 0
    ) {
      throw new Error("RunAgentInput.toolTimeoutMs must be a positive integer");
    }
    return {
      workspaceId: input.workspaceId,
      query: input.query,
      retrievalLimit: input.retrievalLimit,
      maxCharacters: input.maxCharacters,
      toolTimeoutMs: input.toolTimeoutMs,
    };
  }
}
