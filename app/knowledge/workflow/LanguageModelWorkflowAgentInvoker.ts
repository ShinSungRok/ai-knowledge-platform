import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import type { WorkflowAgentInvokeInput } from "./WorkflowAgentInvokeInput";
import type { WorkflowAgentInvokeResult } from "./WorkflowAgentInvokeResult";
import type { WorkflowAgentInvoker } from "./WorkflowAgentInvoker";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";

const DEFAULT_LLM_ROLES: ReadonlyArray<WorkflowAgentRole> = [
  "synthesizer",
  "critic",
];

const ROLE_SYSTEM: Readonly<Partial<Record<WorkflowAgentRole, string>>> = {
  synthesizer:
    "You are a workflow synthesizer. Produce a concise draft from the prior step output. Do not invent facts beyond the input. Reply in plain text only.",
  critic:
    "You are a workflow critic. Review the draft for risks, gaps, and unsupported claims. Be concise. Reply in plain text only.",
};

export interface LanguageModelWorkflowAgentInvokerOptions {
  /**
   * Roles that call {@link LanguageModelProvider}.
   * Default: `synthesizer` and `critic`.
   */
  llmRoles?: ReadonlyArray<WorkflowAgentRole>;
}

/**
 * {@link WorkflowAgentInvoker} that routes selected roles (default:
 * synthesizer / critic) through {@link LanguageModelProvider} and
 * delegates all other roles to an inner invoker (typically Fake or a
 * knowledge bridge).
 */
export class LanguageModelWorkflowAgentInvoker
  implements WorkflowAgentInvoker
{
  private readonly llmRoles: ReadonlySet<WorkflowAgentRole>;

  constructor(
    private readonly languageModel: LanguageModelProvider,
    private readonly fallback: WorkflowAgentInvoker,
    options: LanguageModelWorkflowAgentInvokerOptions = {},
  ) {
    this.llmRoles = new Set(options.llmRoles ?? DEFAULT_LLM_ROLES);
  }

  async invoke(
    input: WorkflowAgentInvokeInput,
  ): Promise<WorkflowAgentInvokeResult> {
    if (!input || typeof input !== "object") {
      throw new Error("WorkflowAgentInvokeInput must be an object");
    }

    if (!this.llmRoles.has(input.role)) {
      return this.fallback.invoke(input);
    }

    const userMessage =
      typeof input.input === "string" ? input.input.trim() : "";
    if (userMessage.length === 0) {
      return {
        ok: false,
        output: "",
        error:
          "LanguageModelWorkflowAgentInvoker requires non-empty input",
      };
    }

    const systemInstruction =
      ROLE_SYSTEM[input.role] ??
      `You are a workflow ${input.role}. Respond concisely in plain text.`;

    try {
      const generated = await this.languageModel.generate({
        systemInstruction,
        userMessage,
      });
      const text =
        typeof generated?.text === "string" ? generated.text.trim() : "";
      if (text.length === 0) {
        return {
          ok: false,
          output: "",
          error: "LanguageModelProvider returned empty text",
        };
      }
      return { ok: true, output: text };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "language model failed";
      return {
        ok: false,
        output: "",
        error: message,
      };
    }
  }
}
