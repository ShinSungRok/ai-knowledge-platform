import type { GenerateCitedGroundedAnswerUseCase } from "../application/GenerateCitedGroundedAnswerUseCase";
import type { McpTool } from "./McpTool";
import type { McpToolDefinition } from "./McpToolDefinition";
import type { McpToolInvokeResult } from "./McpToolInvokeResult";

const TOOL_NAME = "generate_cited_grounded_answer" as const;

const TOOL_DESCRIPTION =
  "Generate a workspace-scoped grounded answer with evidence-bound citations.";

const TOOL_INPUT_KEYS = [
  "workspaceId",
  "query",
  "retrievalLimit",
  "maxCharacters",
] as const;

/**
 * MCP tool adapter that exposes
 * {@link GenerateCitedGroundedAnswerUseCase} as a transport-independent
 * `generate_cited_grounded_answer` capability.
 *
 * Depends only on that use case — never on a concrete citation/RAG/
 * search/provider adapter, and never on an MCP SDK or network
 * transport. `definition` is fixed (name, description, inputKeys).
 * `invoke` validates the four argument keys with the same rules as the
 * use case's application input, then either returns
 * `{ ok: true, toolName, result }` on success or
 * `{ ok: false, toolName, error }` on invalid input / use-case failure
 * — **never throws** across this boundary for those cases.
 */
export class GenerateCitedGroundedAnswerMcpTool implements McpTool {
  readonly definition: McpToolDefinition = {
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    inputKeys: TOOL_INPUT_KEYS,
  };

  constructor(
    private readonly generateCitedGroundedAnswerUseCase: GenerateCitedGroundedAnswerUseCase,
  ) {}

  async invoke(args: Record<string, unknown>): Promise<McpToolInvokeResult> {
    const validated = this.toInput(args);
    if (!validated.ok) {
      return {
        ok: false,
        toolName: TOOL_NAME,
        error: validated.error,
      };
    }

    try {
      const result = await this.generateCitedGroundedAnswerUseCase.execute(
        validated.input,
      );
      return {
        ok: true,
        toolName: TOOL_NAME,
        result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        toolName: TOOL_NAME,
        error: message,
      };
    }
  }

  private toInput(
    args: Record<string, unknown>,
  ):
    | {
        ok: true;
        input: {
          workspaceId: string;
          query: string;
          retrievalLimit: number;
          maxCharacters: number;
        };
      }
    | { ok: false; error: string } {
    if (!args || typeof args !== "object" || Array.isArray(args)) {
      return { ok: false, error: "MCP tool arguments must be an object" };
    }

    const workspaceId = args["workspaceId"];
    if (typeof workspaceId !== "string" || workspaceId.trim().length === 0) {
      return {
        ok: false,
        error: "workspaceId must be a non-empty string",
      };
    }

    const query = args["query"];
    if (typeof query !== "string" || query.trim().length === 0) {
      return { ok: false, error: "query must be a non-empty string" };
    }

    const retrievalLimit = args["retrievalLimit"];
    if (
      typeof retrievalLimit !== "number" ||
      !Number.isInteger(retrievalLimit) ||
      retrievalLimit <= 0
    ) {
      return {
        ok: false,
        error: "retrievalLimit must be a positive integer",
      };
    }

    const maxCharacters = args["maxCharacters"];
    if (
      typeof maxCharacters !== "number" ||
      !Number.isInteger(maxCharacters) ||
      maxCharacters <= 0
    ) {
      return {
        ok: false,
        error: "maxCharacters must be a positive integer",
      };
    }

    return {
      ok: true,
      input: {
        workspaceId,
        query,
        retrievalLimit,
        maxCharacters,
      },
    };
  }
}
