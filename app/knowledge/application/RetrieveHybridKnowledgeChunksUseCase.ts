import type { HybridSearch } from "../search/HybridSearch";
import type { RetrievalResult } from "../retrieval/RetrievalResult";

/**
 * Input for retrieving relevant knowledge chunks via hybrid (vector +
 * keyword) search.
 * Kept separate from {@link RetrievalInput} so the use case owns its own
 * validation contract at the application boundary, mirroring how
 * {@link RetrieveKnowledgeChunksUseCase} keeps `RetrieveKnowledgeChunksInput`
 * separate from `RetrievalInput` instead of reusing a port's input type
 * directly.
 */
export interface RetrieveHybridKnowledgeChunksInput {
  workspaceId: string;
  query: string;
  limit: number;
}

/**
 * Retrieve-hybrid use case: resolve `Workspace`-scoped relevant knowledge
 * chunks for a query through the {@link HybridSearch} port, combining
 * vector and keyword search via reciprocal-rank fusion.
 *
 * Depends only on `HybridSearch` — never on `VectorRetriever`,
 * `KeywordSearch`, `EmbeddingProvider`, `VectorIndex`,
 * `DocumentChunkRepository`, or any concrete adapter. Validates
 * `workspaceId`/`query`/`limit` at the application boundary before
 * delegating, then returns `HybridSearch`'s `RetrievalResult` unchanged —
 * no re-sorting, filtering, or context assembly here. The existing
 * `RetrieveKnowledgeChunksUseCase` and `VectorRetriever` contract are
 * unaffected by this use case.
 */
export class RetrieveHybridKnowledgeChunksUseCase {
  constructor(private readonly hybridSearch: HybridSearch) {}

  async execute(
    input: RetrieveHybridKnowledgeChunksInput,
  ): Promise<RetrievalResult> {
    const validated = this.toInput(input);
    return this.hybridSearch.search(validated);
  }

  private toInput(
    input: RetrieveHybridKnowledgeChunksInput,
  ): RetrieveHybridKnowledgeChunksInput {
    if (!input || typeof input !== "object") {
      throw new Error("RetrieveHybridKnowledgeChunksInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "RetrieveHybridKnowledgeChunksInput.workspaceId must be a non-empty string",
      );
    }
    if (typeof input.query !== "string" || input.query.trim().length === 0) {
      throw new Error(
        "RetrieveHybridKnowledgeChunksInput.query must be a non-empty string",
      );
    }
    if (
      typeof input.limit !== "number" ||
      !Number.isInteger(input.limit) ||
      input.limit <= 0
    ) {
      throw new Error(
        "RetrieveHybridKnowledgeChunksInput.limit must be a positive integer",
      );
    }
    return {
      workspaceId: input.workspaceId,
      query: input.query,
      limit: input.limit,
    };
  }
}
