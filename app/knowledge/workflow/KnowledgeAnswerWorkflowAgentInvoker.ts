import type { WorkflowAgentInvokeInput } from "./WorkflowAgentInvokeInput";
import type { WorkflowAgentInvokeResult } from "./WorkflowAgentInvokeResult";
import type { WorkflowAgentInvoker } from "./WorkflowAgentInvoker";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";
import type { WorkflowKnowledgeAnswerPort } from "./WorkflowKnowledgeAnswerPort";

export interface KnowledgeAnswerWorkflowAgentInvokerOptions {
  /**
   * Roles that call {@link WorkflowKnowledgeAnswerPort}.
   * Default: `researcher` only.
   */
  knowledgeRoles?: ReadonlyArray<WorkflowAgentRole>;
}

/**
 * {@link WorkflowAgentInvoker} that routes selected roles (default:
 * researcher) through a P2 knowledge-answer port and delegates all other
 * roles to an inner invoker (typically {@link FakeWorkflowAgentInvoker}).
 */
export class KnowledgeAnswerWorkflowAgentInvoker
  implements WorkflowAgentInvoker
{
  private readonly knowledgeRoles: ReadonlySet<WorkflowAgentRole>;

  constructor(
    private readonly knowledge: WorkflowKnowledgeAnswerPort,
    private readonly fallback: WorkflowAgentInvoker,
    options: KnowledgeAnswerWorkflowAgentInvokerOptions = {},
  ) {
    this.knowledgeRoles = new Set(options.knowledgeRoles ?? ["researcher"]);
  }

  async invoke(
    input: WorkflowAgentInvokeInput,
  ): Promise<WorkflowAgentInvokeResult> {
    if (!input || typeof input !== "object") {
      throw new Error("WorkflowAgentInvokeInput must be an object");
    }

    if (!this.knowledgeRoles.has(input.role)) {
      return this.fallback.invoke(input);
    }

    const query = typeof input.input === "string" ? input.input.trim() : "";
    if (query.length === 0) {
      return {
        ok: false,
        output: "",
        error:
          "KnowledgeAnswerWorkflowAgentInvoker requires non-empty input as query",
      };
    }

    try {
      const result = await this.knowledge.answer({
        workspaceId: input.workspaceId,
        query,
      });
      const flag = result.insufficientEvidence ? "insufficient" : "grounded";
      return {
        ok: true,
        output:
          `knowledge:${flag}:citations=${result.citationCount}:` +
          result.answerText,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "knowledge answer failed";
      return {
        ok: false,
        output: "",
        error: message,
      };
    }
  }
}
