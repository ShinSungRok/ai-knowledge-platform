import type { BuildGroundedPromptUseCase } from "./BuildGroundedPromptUseCase";
import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import type { GeneratedText } from "../ai/GeneratedText";

/**
 * Input for generating `workspace`-scoped grounded text for a query.
 * Kept separate from {@link BuildGroundedPromptInput} so this use case
 * owns its own validation contract at the application boundary,
 * mirroring how {@link BuildGroundedPromptUseCase} keeps
 * `BuildGroundedPromptInput` separate from
 * `RetrieveGroundingContextInput` instead of reusing another use case's
 * input type directly.
 */
export interface GenerateGroundedTextInput {
  workspaceId: string;
  query: string;
  retrievalLimit: number;
  maxCharacters: number;
}

/**
 * Generate-grounded-text use case: build a `workspace`-scoped grounded
 * prompt for a query and pass it to an LLM provider for generation.
 *
 * Depends only on `BuildGroundedPromptUseCase` and `LanguageModelProvider`
 * — never on the grounding-context retrieval use case, a prompt
 * builder, any retrieval/search/context port, or a concrete adapter.
 * Validates
 * `workspaceId`/`query`/`retrievalLimit`/`maxCharacters` at the
 * application boundary, then calls
 * `BuildGroundedPromptUseCase.execute({ workspaceId, query,
 * retrievalLimit, maxCharacters })` and passes the returned
 * `GroundedPrompt` straight into `LanguageModelProvider.generate(prompt)`,
 * returning the resulting `GeneratedText` unchanged. `GeneratedText` is
 * plain generated text here — judging grounding sufficiency,
 * structuring an answer, and attaching citations are all out of scope
 * for this use case. `BuildGroundedPromptUseCase`'s own
 * retrieval-then-prompt-building flow is unaffected.
 */
export class GenerateGroundedTextUseCase {
  constructor(
    private readonly buildGroundedPromptUseCase: BuildGroundedPromptUseCase,
    private readonly languageModelProvider: LanguageModelProvider,
  ) {}

  async execute(input: GenerateGroundedTextInput): Promise<GeneratedText> {
    const validated = this.toInput(input);

    const prompt = await this.buildGroundedPromptUseCase.execute({
      workspaceId: validated.workspaceId,
      query: validated.query,
      retrievalLimit: validated.retrievalLimit,
      maxCharacters: validated.maxCharacters,
    });

    return this.languageModelProvider.generate(prompt);
  }

  private toInput(input: GenerateGroundedTextInput): GenerateGroundedTextInput {
    if (!input || typeof input !== "object") {
      throw new Error("GenerateGroundedTextInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "GenerateGroundedTextInput.workspaceId must be a non-empty string",
      );
    }
    if (typeof input.query !== "string" || input.query.trim().length === 0) {
      throw new Error("GenerateGroundedTextInput.query must be a non-empty string");
    }
    if (
      typeof input.retrievalLimit !== "number" ||
      !Number.isInteger(input.retrievalLimit) ||
      input.retrievalLimit <= 0
    ) {
      throw new Error(
        "GenerateGroundedTextInput.retrievalLimit must be a positive integer",
      );
    }
    if (
      typeof input.maxCharacters !== "number" ||
      !Number.isInteger(input.maxCharacters) ||
      input.maxCharacters <= 0
    ) {
      throw new Error(
        "GenerateGroundedTextInput.maxCharacters must be a positive integer",
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
