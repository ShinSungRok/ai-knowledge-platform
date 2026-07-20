import type { AgentOrchestrator } from "../agent/AgentOrchestrator";
import type { AgentRunResult } from "../agent/AgentRunResult";
import type { MemoryStore } from "../memory/MemoryStore";
import type { MemoryEntry } from "../memory/MemoryEntry";

/**
 * Input for running an Agent with session memory recall/write at the
 * application boundary. Includes AgentGoal-shaped fields plus
 * `sessionId` for Memory scoping.
 */
export interface RunAgentWithMemoryInput {
  workspaceId: string;
  query: string;
  retrievalLimit: number;
  maxCharacters: number;
  toolTimeoutMs: number;
  sessionId: string;
}

/**
 * Result of a memory-connected Agent run: entries recalled before this
 * turn was written, the unchanged {@link AgentRunResult}, and the
 * user/agent entries written for this turn.
 */
export interface RunAgentWithMemoryResult {
  recalled: readonly MemoryEntry[];
  run: AgentRunResult;
  written: readonly [MemoryEntry, MemoryEntry];
}

/**
 * Run-agent-with-memory use case: recall session memory, append the
 * user turn, run the Agent via {@link AgentOrchestrator}, append a
 * fixed agent summary turn, and return recall/run/written together.
 *
 * Depends only on {@link MemoryStore} and {@link AgentOrchestrator}
 * ports — never on concrete adapters. Does not inject memory into the
 * planner/orchestrator. The memory-free run-agent application entry
 * point is retained unchanged.
 */
export class RunAgentWithMemoryUseCase {
  constructor(
    private readonly memoryStore: MemoryStore,
    private readonly agentOrchestrator: AgentOrchestrator,
  ) {}

  async execute(
    input: RunAgentWithMemoryInput,
  ): Promise<RunAgentWithMemoryResult> {
    const validated = this.toInput(input);

    const recalled = await this.memoryStore.listBySession(
      validated.workspaceId,
      validated.sessionId,
    );

    const userEntry = await this.memoryStore.append({
      workspaceId: validated.workspaceId,
      sessionId: validated.sessionId,
      role: "user",
      content: validated.query,
    });

    const run = await this.agentOrchestrator.run({
      workspaceId: validated.workspaceId,
      query: validated.query,
      retrievalLimit: validated.retrievalLimit,
      maxCharacters: validated.maxCharacters,
      toolTimeoutMs: validated.toolTimeoutMs,
    });

    const agentEntry = await this.memoryStore.append({
      workspaceId: validated.workspaceId,
      sessionId: validated.sessionId,
      role: "agent",
      content: `status=${run.status}; decision=${run.review.decision}; reason=${run.review.reason}`,
    });

    return {
      recalled,
      run,
      written: [userEntry, agentEntry],
    };
  }

  private toInput(input: RunAgentWithMemoryInput): RunAgentWithMemoryInput {
    if (!input || typeof input !== "object") {
      throw new Error("RunAgentWithMemoryInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "RunAgentWithMemoryInput.workspaceId must be a non-empty string",
      );
    }
    if (typeof input.query !== "string" || input.query.trim().length === 0) {
      throw new Error(
        "RunAgentWithMemoryInput.query must be a non-empty string",
      );
    }
    if (
      typeof input.retrievalLimit !== "number" ||
      !Number.isInteger(input.retrievalLimit) ||
      input.retrievalLimit <= 0
    ) {
      throw new Error(
        "RunAgentWithMemoryInput.retrievalLimit must be a positive integer",
      );
    }
    if (
      typeof input.maxCharacters !== "number" ||
      !Number.isInteger(input.maxCharacters) ||
      input.maxCharacters <= 0
    ) {
      throw new Error(
        "RunAgentWithMemoryInput.maxCharacters must be a positive integer",
      );
    }
    if (
      typeof input.toolTimeoutMs !== "number" ||
      !Number.isInteger(input.toolTimeoutMs) ||
      input.toolTimeoutMs <= 0
    ) {
      throw new Error(
        "RunAgentWithMemoryInput.toolTimeoutMs must be a positive integer",
      );
    }
    if (
      typeof input.sessionId !== "string" ||
      input.sessionId.trim().length === 0
    ) {
      throw new Error(
        "RunAgentWithMemoryInput.sessionId must be a non-empty string",
      );
    }
    return {
      workspaceId: input.workspaceId,
      query: input.query,
      retrievalLimit: input.retrievalLimit,
      maxCharacters: input.maxCharacters,
      toolTimeoutMs: input.toolTimeoutMs,
      sessionId: input.sessionId,
    };
  }
}
