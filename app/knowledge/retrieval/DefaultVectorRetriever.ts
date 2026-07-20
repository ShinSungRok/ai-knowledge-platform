import type { EmbeddingProvider } from "../embedding/EmbeddingProvider";
import type { VectorIndex } from "../embedding/VectorIndex";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { RetrievalInput } from "./RetrievalInput";
import type { RetrievalResult, RetrievedChunk } from "./RetrievalResult";
import type { VectorRetriever } from "./VectorRetriever";

/**
 * Default {@link VectorRetriever} adapter: embeds the query, finds the
 * nearest vectors in one workspace, and hydrates each into its actual
 * {@link DocumentChunk}.
 *
 * Depends only on the `EmbeddingProvider`, `VectorIndex`, and
 * `DocumentChunkRepository` ports — never a concrete adapter. `query` is
 * converted to a vector via `EmbeddingProvider.embed`, then
 * `VectorIndex.findNearest` ranks candidates within `workspaceId`. Each
 * ranked result is resolved to its `DocumentChunk` via
 * `DocumentChunkRepository.findById`; a result whose chunk no longer
 * exists (a stale vector left behind by e.g. a chunk replacement that was
 * never re-embedded) is silently skipped rather than failing the whole
 * request. The output preserves `VectorIndex`'s own ranking order — this
 * retriever never re-sorts — and never has more than `limit` entries,
 * though it may have fewer once stale vectors are excluded.
 */
export class DefaultVectorRetriever implements VectorRetriever {
  constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly vectorIndex: VectorIndex,
    private readonly documentChunkRepository: DocumentChunkRepository,
  ) {}

  async retrieve(input: RetrievalInput): Promise<RetrievalResult> {
    const { workspaceId, query, limit } = this.toInput(input);

    const queryVector = await this.embeddingProvider.embed(query);
    const nearest = await this.vectorIndex.findNearest(
      workspaceId,
      queryVector,
      limit,
    );

    const chunks: RetrievedChunk[] = [];
    for (const scored of nearest) {
      const chunk = await this.documentChunkRepository.findById(
        workspaceId,
        scored.vector.chunkId,
      );
      if (!chunk) {
        continue;
      }
      chunks.push({ chunk, score: scored.score });
    }

    return { query, chunks };
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
