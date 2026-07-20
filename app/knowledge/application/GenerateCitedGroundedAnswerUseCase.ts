import type { GenerateGroundedAnswerUseCase } from "./GenerateGroundedAnswerUseCase";
import type { CitationBuilder } from "../citation/CitationBuilder";
import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";

/**
 * Input for generating a `workspace`-scoped cited grounded answer for
 * a query. Kept separate from {@link GenerateGroundedAnswerInput} so
 * this use case owns its own validation contract at the application
 * boundary, mirroring how the grounded-answer use case keeps its input
 * separate from lower-level input types instead of reusing another use
 * case's input type directly.
 */
export interface GenerateCitedGroundedAnswerInput {
  workspaceId: string;
  query: string;
  retrievalLimit: number;
  maxCharacters: number;
}

/**
 * Generate-cited-grounded-answer use case: produce a `workspace`-scoped
 * grounded answer for a query and attach evidence-bound citations to
 * it.
 *
 * Depends only on the grounded-answer generation use case and a
 * citation-builder port — never on a concrete adapter, or on the
 * lower-level retrieval/prompt/provider/assembler ports those
 * dependencies already own. Validates
 * `workspaceId`/`query`/`retrievalLimit`/`maxCharacters` at the
 * application boundary, then calls the grounded-answer use case's
 * `execute` with the mapped input and passes the returned
 * `GroundedAnswer` straight into the citation builder's `build`,
 * returning `{ answer, citations }` as a `CitedGroundedAnswer`
 * unchanged. The citation builder is always called — including for an
 * insufficient-evidence answer — so an empty-evidence answer yields an
 * empty citation list via the citation module's own evidence-only
 * policy. The grounded-answer use case's own evidence-gated
 * retrieval/prompt/generation/assembly flow is unaffected by this use
 * case.
 */
export class GenerateCitedGroundedAnswerUseCase {
  constructor(
    private readonly generateGroundedAnswerUseCase: GenerateGroundedAnswerUseCase,
    private readonly citationBuilder: CitationBuilder,
  ) {}

  async execute(
    input: GenerateCitedGroundedAnswerInput,
  ): Promise<CitedGroundedAnswer> {
    const validated = this.toInput(input);

    const answer = await this.generateGroundedAnswerUseCase.execute({
      workspaceId: validated.workspaceId,
      query: validated.query,
      retrievalLimit: validated.retrievalLimit,
      maxCharacters: validated.maxCharacters,
    });

    const citations = await this.citationBuilder.build(answer);

    return { answer, citations };
  }

  private toInput(
    input: GenerateCitedGroundedAnswerInput,
  ): GenerateCitedGroundedAnswerInput {
    if (!input || typeof input !== "object") {
      throw new Error("GenerateCitedGroundedAnswerInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "GenerateCitedGroundedAnswerInput.workspaceId must be a non-empty string",
      );
    }
    if (typeof input.query !== "string" || input.query.trim().length === 0) {
      throw new Error(
        "GenerateCitedGroundedAnswerInput.query must be a non-empty string",
      );
    }
    if (
      typeof input.retrievalLimit !== "number" ||
      !Number.isInteger(input.retrievalLimit) ||
      input.retrievalLimit <= 0
    ) {
      throw new Error(
        "GenerateCitedGroundedAnswerInput.retrievalLimit must be a positive integer",
      );
    }
    if (
      typeof input.maxCharacters !== "number" ||
      !Number.isInteger(input.maxCharacters) ||
      input.maxCharacters <= 0
    ) {
      throw new Error(
        "GenerateCitedGroundedAnswerInput.maxCharacters must be a positive integer",
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
