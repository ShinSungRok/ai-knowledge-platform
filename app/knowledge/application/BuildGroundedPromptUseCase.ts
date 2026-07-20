import type { RetrieveGroundingContextUseCase } from "./RetrieveGroundingContextUseCase";
import type { PromptBuilder } from "../prompt/PromptBuilder";
import type { GroundedPrompt } from "../prompt/GroundedPrompt";

/**
 * Input for building a `workspace`-scoped grounded prompt for a query.
 * Kept separate from {@link RetrieveGroundingContextInput} so this use
 * case owns its own validation contract at the application boundary,
 * mirroring how {@link RetrieveGroundingContextUseCase} keeps
 * `RetrieveGroundingContextInput` separate from `RetrievalInput`/
 * `ContextAssemblyInput` instead of reusing another use case's input
 * type directly.
 */
export interface BuildGroundedPromptInput {
  workspaceId: string;
  query: string;
  retrievalLimit: number;
  maxCharacters: number;
}

/**
 * Build-grounded-prompt use case: resolve a `workspace`-scoped grounding
 * context for a query and render it into an LLM-independent
 * `GroundedPrompt`.
 *
 * Depends only on `RetrieveGroundingContextUseCase` and `PromptBuilder`
 * — never on `RerankedSearch`, `HybridSearch`, `ContextAssembler`, any
 * retrieval/search/context port, or a concrete adapter. Validates
 * `workspaceId`/`query`/`retrievalLimit`/`maxCharacters` at the
 * application boundary, then calls
 * `RetrieveGroundingContextUseCase.execute({ workspaceId, query,
 * retrievalLimit, maxCharacters })` and passes the returned
 * `GroundingContext` straight into `PromptBuilder.build(context)`,
 * returning the resulting `GroundedPrompt` unchanged — no LLM call,
 * answer generation, or citation concern here.
 * `RetrieveGroundingContextUseCase`'s own reranked-retrieval and
 * context-assembly flow is unaffected by this use case.
 */
export class BuildGroundedPromptUseCase {
  constructor(
    private readonly retrieveGroundingContextUseCase: RetrieveGroundingContextUseCase,
    private readonly promptBuilder: PromptBuilder,
  ) {}

  async execute(input: BuildGroundedPromptInput): Promise<GroundedPrompt> {
    const validated = this.toInput(input);

    const context = await this.retrieveGroundingContextUseCase.execute({
      workspaceId: validated.workspaceId,
      query: validated.query,
      retrievalLimit: validated.retrievalLimit,
      maxCharacters: validated.maxCharacters,
    });

    return this.promptBuilder.build(context);
  }

  private toInput(input: BuildGroundedPromptInput): BuildGroundedPromptInput {
    if (!input || typeof input !== "object") {
      throw new Error("BuildGroundedPromptInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "BuildGroundedPromptInput.workspaceId must be a non-empty string",
      );
    }
    if (typeof input.query !== "string" || input.query.trim().length === 0) {
      throw new Error("BuildGroundedPromptInput.query must be a non-empty string");
    }
    if (
      typeof input.retrievalLimit !== "number" ||
      !Number.isInteger(input.retrievalLimit) ||
      input.retrievalLimit <= 0
    ) {
      throw new Error(
        "BuildGroundedPromptInput.retrievalLimit must be a positive integer",
      );
    }
    if (
      typeof input.maxCharacters !== "number" ||
      !Number.isInteger(input.maxCharacters) ||
      input.maxCharacters <= 0
    ) {
      throw new Error(
        "BuildGroundedPromptInput.maxCharacters must be a positive integer",
      );
    }
    return {
      workspaceId: input.workspaceId,
      query: input.query,
      retrievalLimit: input.retrievalLimit,
      maxCharacters: input.maxCharacters,
    };
  }
}
