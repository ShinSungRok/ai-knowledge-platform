import type { HybridSearch } from "./HybridSearch";
import type { Reranker } from "./Reranker";
import type { RerankedSearch } from "./RerankedSearch";
import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult } from "../retrieval/RetrievalResult";

/**
 * Default {@link RerankedSearch} adapter: runs a {@link HybridSearch}
 * request, then hands its result's chunks to a {@link Reranker} for
 * deterministic re-ordering.
 *
 * Depends only on the `HybridSearch` and `Reranker` ports — never a
 * concrete adapter, `VectorRetriever`, or `KeywordSearch` directly. Input
 * is validated once at this adapter's own boundary, then `HybridSearch.search`
 * is called first with that validated `RetrievalInput`; its
 * `RetrievalResult.chunks` are passed to
 * `Reranker.rerank({ workspaceId, query, chunks })`, and the reranked
 * chunks become this adapter's own `RetrievalResult.chunks`, in the
 * order `Reranker` returned them (never re-sorted again). `query` on the
 * returned result is the validated input query. Invalid input is
 * rejected before either dependency is called.
 */
export class DefaultRerankedSearch implements RerankedSearch {
  constructor(
    private readonly hybridSearch: HybridSearch,
    private readonly reranker: Reranker,
  ) {}

  async search(input: RetrievalInput): Promise<RetrievalResult> {
    const validated = this.toInput(input);

    const hybridResult = await this.hybridSearch.search(validated);

    const rerankedChunks = await this.reranker.rerank({
      workspaceId: validated.workspaceId,
      query: validated.query,
      chunks: hybridResult.chunks,
    });

    return { query: validated.query, chunks: rerankedChunks };
  }

  private toInput(input: RetrievalInput): RetrievalInput {
    if (!input || typeof input !== "object") {
      throw new Error("RetrievalInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error("RetrievalInput.workspaceId must be a non-empty string");
    }
    if (typeof input.query !== "string" || input.query.trim().length === 0) {
      throw new Error("RetrievalInput.query must be a non-empty string");
    }
    if (
      typeof input.limit !== "number" ||
      !Number.isInteger(input.limit) ||
      input.limit <= 0
    ) {
      throw new Error("RetrievalInput.limit must be a positive integer");
    }
    return { workspaceId: input.workspaceId, query: input.query, limit: input.limit };
  }
}
