import type { RetrieveGroundingContextUseCase } from "./RetrieveGroundingContextUseCase";
import type { PromptBuilder } from "../prompt/PromptBuilder";
import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import type { GroundedAnswerAssembler } from "../rag/GroundedAnswerAssembler";
import type { GroundedAnswer } from "../rag/GroundedAnswer";

/**
 * Input for generating a `workspace`-scoped grounded answer for a
 * query. Kept separate from the other retrieval/prompt/generation use
 * cases' own input types so this use case owns its own validation
 * contract at the application boundary, mirroring the same
 * separation those use cases keep from each other and from
 * lower-level port inputs.
 */
export interface GenerateGroundedAnswerInput {
  workspaceId: string;
  query: string;
  retrievalLimit: number;
  maxCharacters: number;
}

/**
 * Generate-grounded-answer use case: resolve a `workspace`-scoped
 * grounding context for a query, and — only when that context actually
 * carries evidence — build a prompt from it, generate text from that
 * prompt, and combine both into one evidence-bound `GroundedAnswer`.
 *
 * Depends only on the grounding-context retrieval use case, a prompt
 * builder port, an LLM provider port, and an answer assembler port —
 * never on a concrete adapter, or on the standalone prompt-building or
 * text-generation use cases (this use case orchestrates the same
 * retrieval-context/generated-text flow directly, so it can bind the
 * exact same context and generated text together as one answer's
 * evidence — reusing those other use cases would retrieve/generate
 * twice and risk mismatched evidence). Validates
 * `workspaceId`/`query`/`retrievalLimit`/`maxCharacters` at the
 * application boundary, then always resolves the grounding context
 * first. When that context's evidence blocks are empty, the prompt
 * builder and LLM provider are **never called** — the use case goes
 * straight to the answer assembler with an empty generated text, so no
 * generation happens, and no generated text can be smuggled in as an
 * answer, for a query with no evidence. When the context carries at
 * least one evidence block, the prompt builder builds a prompt from it,
 * the LLM provider generates text from that prompt, and both the
 * context and the generated text are passed to the answer assembler
 * together. The assembler's own insufficient-evidence policy and
 * evidence-preservation behavior are unaffected by this use case; the
 * resulting `GroundedAnswer` is returned unchanged.
 */
export class GenerateGroundedAnswerUseCase {
  constructor(
    private readonly retrieveGroundingContextUseCase: RetrieveGroundingContextUseCase,
    private readonly promptBuilder: PromptBuilder,
    private readonly languageModelProvider: LanguageModelProvider,
    private readonly groundedAnswerAssembler: GroundedAnswerAssembler,
  ) {}

  async execute(input: GenerateGroundedAnswerInput): Promise<GroundedAnswer> {
    const validated = this.toInput(input);

    const context = await this.retrieveGroundingContextUseCase.execute({
      workspaceId: validated.workspaceId,
      query: validated.query,
      retrievalLimit: validated.retrievalLimit,
      maxCharacters: validated.maxCharacters,
    });

    if (context.blocks.length === 0) {
      return this.groundedAnswerAssembler.assemble({
        context,
        generatedText: { text: "" },
      });
    }

    const prompt = await this.promptBuilder.build(context);
    const generatedText = await this.languageModelProvider.generate(prompt);

    return this.groundedAnswerAssembler.assemble({ context, generatedText });
  }

  private toInput(input: GenerateGroundedAnswerInput): GenerateGroundedAnswerInput {
    if (!input || typeof input !== "object") {
      throw new Error("GenerateGroundedAnswerInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "GenerateGroundedAnswerInput.workspaceId must be a non-empty string",
      );
    }
    if (typeof input.query !== "string" || input.query.trim().length === 0) {
      throw new Error("GenerateGroundedAnswerInput.query must be a non-empty string");
    }
    if (
      typeof input.retrievalLimit !== "number" ||
      !Number.isInteger(input.retrievalLimit) ||
      input.retrievalLimit <= 0
    ) {
      throw new Error(
        "GenerateGroundedAnswerInput.retrievalLimit must be a positive integer",
      );
    }
    if (
      typeof input.maxCharacters !== "number" ||
      !Number.isInteger(input.maxCharacters) ||
      input.maxCharacters <= 0
    ) {
      throw new Error(
        "GenerateGroundedAnswerInput.maxCharacters must be a positive integer",
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
