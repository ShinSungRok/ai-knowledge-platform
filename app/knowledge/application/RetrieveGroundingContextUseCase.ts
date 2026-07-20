import type { RerankedSearch } from "../search/RerankedSearch";
import type { ContextAssembler } from "../context/ContextAssembler";
import type { GroundingContext } from "../context/GroundingContext";

/**
 * Input for retrieving a provenance-preserving grounding context for a
 * query.
 * Kept separate from {@link RetrievalInput} and
 * {@link ContextAssemblyInput} so the use case owns its own validation
 * contract at the application boundary, mirroring how
 * {@link RetrieveHybridKnowledgeChunksUseCase} keeps
 * `RetrieveHybridKnowledgeChunksInput` separate from `RetrievalInput`
 * instead of reusing a port's input type directly.
 */
export interface RetrieveGroundingContextInput {
  workspaceId: string;
  query: string;
  retrievalLimit: number;
  maxCharacters: number;
}

/**
 * Retrieve-grounding-context use case: resolve a `workspace`-scoped,
 * bounded grounding context for a query by combining reranked retrieval
 * with provenance-preserving context assembly.
 *
 * Depends only on `RerankedSearch` and `ContextAssembler` — never on
 * `HybridSearch`, `VectorRetriever`, `KeywordSearch`, `Reranker`,
 * `EmbeddingProvider`, `VectorIndex`, `DocumentChunkRepository`,
 * `KnowledgeDocumentRepository`, or any concrete adapter. Validates
 * `workspaceId`/`query`/`retrievalLimit`/`maxCharacters` at the
 * application boundary, then calls
 * `RerankedSearch.search({ workspaceId, query, limit: retrievalLimit })`
 * and passes its `RetrievalResult.chunks` straight into
 * `ContextAssembler.assemble({ workspaceId, query, chunks, maxCharacters
 * })`, returning the resulting `GroundingContext` unchanged — no prompt
 * building or citation concern here. The existing
 * `RetrieveHybridKnowledgeChunksUseCase` and `RetrieveKnowledgeChunksUseCase`
 * are unaffected by this use case.
 */
export class RetrieveGroundingContextUseCase {
  constructor(
    private readonly rerankedSearch: RerankedSearch,
    private readonly contextAssembler: ContextAssembler,
  ) {}

  async execute(
    input: RetrieveGroundingContextInput,
  ): Promise<GroundingContext> {
    const validated = this.toInput(input);

    const retrievalResult = await this.rerankedSearch.search({
      workspaceId: validated.workspaceId,
      query: validated.query,
      limit: validated.retrievalLimit,
    });

    return this.contextAssembler.assemble({
      workspaceId: validated.workspaceId,
      query: validated.query,
      chunks: retrievalResult.chunks,
      maxCharacters: validated.maxCharacters,
    });
  }

  private toInput(
    input: RetrieveGroundingContextInput,
  ): RetrieveGroundingContextInput {
    if (!input || typeof input !== "object") {
      throw new Error("RetrieveGroundingContextInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "RetrieveGroundingContextInput.workspaceId must be a non-empty string",
      );
    }
    if (typeof input.query !== "string" || input.query.trim().length === 0) {
      throw new Error(
        "RetrieveGroundingContextInput.query must be a non-empty string",
      );
    }
    if (
      typeof input.retrievalLimit !== "number" ||
      !Number.isInteger(input.retrievalLimit) ||
      input.retrievalLimit <= 0
    ) {
      throw new Error(
        "RetrieveGroundingContextInput.retrievalLimit must be a positive integer",
      );
    }
    if (
      typeof input.maxCharacters !== "number" ||
      !Number.isInteger(input.maxCharacters) ||
      input.maxCharacters <= 0
    ) {
      throw new Error(
        "RetrieveGroundingContextInput.maxCharacters must be a positive integer",
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
