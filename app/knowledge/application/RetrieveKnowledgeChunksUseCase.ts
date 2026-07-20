import type { VectorRetriever } from "../retrieval/VectorRetriever";
import type { RetrievalResult } from "../retrieval/RetrievalResult";

/**
 * Input for retrieving relevant knowledge chunks.
 * Kept separate from {@link RetrievalInput} so the use case owns its own
 * validation contract at the application boundary, mirroring how the
 * other use cases in this module define their own `*Input` types instead
 * of reusing a port's input type directly.
 */
export interface RetrieveKnowledgeChunksInput {
  workspaceId: string;
  query: string;
  limit: number;
}

/**
 * Retrieve use case: resolve `Workspace`-scoped relevant knowledge chunks
 * for a query through the {@link VectorRetriever} port.
 *
 * Depends only on `VectorRetriever` — never on `EmbeddingProvider`,
 * `VectorIndex`, `DocumentChunkRepository`, or any concrete adapter.
 * Validates `workspaceId`/`query`/`limit` at the application boundary
 * before delegating, then returns the retriever's `RetrievalResult`
 * unchanged — no re-sorting, filtering, or context assembly here.
 */
export class RetrieveKnowledgeChunksUseCase {
  constructor(private readonly vectorRetriever: VectorRetriever) {}

  async execute(input: RetrieveKnowledgeChunksInput): Promise<RetrievalResult> {
    const validated = this.toInput(input);
    return this.vectorRetriever.retrieve(validated);
  }

  private toInput(
    input: RetrieveKnowledgeChunksInput,
  ): RetrieveKnowledgeChunksInput {
    if (!input || typeof input !== "object") {
      throw new Error("RetrieveKnowledgeChunksInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "RetrieveKnowledgeChunksInput.workspaceId must be a non-empty string",
      );
    }
    if (typeof input.query !== "string" || input.query.trim().length === 0) {
      throw new Error(
        "RetrieveKnowledgeChunksInput.query must be a non-empty string",
      );
    }
    if (
      typeof input.limit !== "number" ||
      !Number.isInteger(input.limit) ||
      input.limit <= 0
    ) {
      throw new Error(
        "RetrieveKnowledgeChunksInput.limit must be a positive integer",
      );
    }
    return {
      workspaceId: input.workspaceId,
      query: input.query,
      limit: input.limit,
    };
  }
}
