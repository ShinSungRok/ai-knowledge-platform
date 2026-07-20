import type { AgentGoal } from "./AgentGoal";
import type { AgentPlan } from "./AgentPlan";
import type { AgentPlanner } from "./AgentPlanner";

const CITED_ANSWER_TOOL_NAME = "generate_cited_grounded_answer" as const;
const FIRST_STEP_ID = "step-1" as const;

/**
 * Deterministic {@link AgentPlanner} for knowledge-aware Agent runs.
 *
 * No constructor dependencies — never injects an LLM provider,
 * repository, or tool-calling executor. Validates {@link AgentGoal},
 * then always returns a single-step plan that invokes the known
 * `generate_cited_grounded_answer` tool with the goal's cited-answer
 * argument keys. Identical valid inputs produce byte-identical plans.
 */
export class DeterministicKnowledgeAgentPlanner implements AgentPlanner {
  async plan(goal: AgentGoal): Promise<AgentPlan> {
    const validated = this.toGoal(goal);

    return {
      goal: {
        workspaceId: validated.workspaceId,
        query: validated.query,
        retrievalLimit: validated.retrievalLimit,
        maxCharacters: validated.maxCharacters,
        toolTimeoutMs: validated.toolTimeoutMs,
      },
      steps: [
        {
          id: FIRST_STEP_ID,
          toolName: CITED_ANSWER_TOOL_NAME,
          arguments: {
            workspaceId: validated.workspaceId,
            query: validated.query,
            retrievalLimit: validated.retrievalLimit,
            maxCharacters: validated.maxCharacters,
          },
        },
      ],
    };
  }

  private toGoal(goal: AgentGoal): AgentGoal {
    if (!goal || typeof goal !== "object") {
      throw new Error("AgentGoal must be an object");
    }
    if (
      typeof goal.workspaceId !== "string" ||
      goal.workspaceId.trim().length === 0
    ) {
      throw new Error("AgentGoal.workspaceId must be a non-empty string");
    }
    if (typeof goal.query !== "string" || goal.query.trim().length === 0) {
      throw new Error("AgentGoal.query must be a non-empty string");
    }
    if (
      typeof goal.retrievalLimit !== "number" ||
      !Number.isInteger(goal.retrievalLimit) ||
      goal.retrievalLimit <= 0
    ) {
      throw new Error("AgentGoal.retrievalLimit must be a positive integer");
    }
    if (
      typeof goal.maxCharacters !== "number" ||
      !Number.isInteger(goal.maxCharacters) ||
      goal.maxCharacters <= 0
    ) {
      throw new Error("AgentGoal.maxCharacters must be a positive integer");
    }
    if (
      typeof goal.toolTimeoutMs !== "number" ||
      !Number.isInteger(goal.toolTimeoutMs) ||
      goal.toolTimeoutMs <= 0
    ) {
      throw new Error("AgentGoal.toolTimeoutMs must be a positive integer");
    }
    return {
      workspaceId: goal.workspaceId,
      query: goal.query,
      retrievalLimit: goal.retrievalLimit,
      maxCharacters: goal.maxCharacters,
      toolTimeoutMs: goal.toolTimeoutMs,
    };
  }
}
