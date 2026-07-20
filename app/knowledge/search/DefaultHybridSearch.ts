import type { DocumentChunk } from "../domain/DocumentChunk";
import type { VectorRetriever } from "../retrieval/VectorRetriever";
import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult, RetrievedChunk } from "../retrieval/RetrievalResult";
import type { HybridSearch } from "./HybridSearch";
import type { KeywordSearch } from "./KeywordSearch";

/** Reciprocal-rank-fusion constant `k` — the standard RRF smoothing term, applied as `1 / (k + rank)`. */
const RRF_K = 60;

interface FusedEntry {
  chunk: DocumentChunk;
  score: number;
}

/**
 * Default {@link HybridSearch} adapter: combines {@link VectorRetriever}
 * and {@link KeywordSearch} results into one deterministic ranking via
 * reciprocal-rank fusion (RRF).
 *
 * Depends only on the `VectorRetriever` and `KeywordSearch` ports — never
 * a concrete adapter. Both searches are run with the same input; each
 * source's results are 1-based ranked (best match = rank 1), and every
 * chunk's fused score is the sum, over each source that returned it, of
 * `1 / (RRF_K + rank)`. Chunks present in both sources are merged into a
 * single result using the chunk instance returned by whichever source is
 * applied first (vector, then keyword) — both sources hydrate from the
 * same `DocumentChunkRepository`, so their chunk data is expected to
 * agree. Results are sorted by fused score descending, then chunk `id`
 * ascending as a deterministic tie-break, and capped at `limit`. Input is
 * validated before either dependency is called, so an invalid input never
 * reaches `VectorRetriever` or `KeywordSearch`.
 */
export class DefaultHybridSearch implements HybridSearch {
  constructor(
    private readonly vectorRetriever: VectorRetriever,
    private readonly keywordSearch: KeywordSearch,
  ) {}

  async search(input: RetrievalInput): Promise<RetrievalResult> {
    const validated = this.toInput(input);

    const [vectorResult, keywordResult] = await Promise.all([
      this.vectorRetriever.retrieve(validated),
      this.keywordSearch.search(validated),
    ]);

    const fused = new Map<string, FusedEntry>();
    this.applyReciprocalRanks(fused, vectorResult.chunks);
    this.applyReciprocalRanks(fused, keywordResult.chunks);

    const entries = Array.from(fused.values());
    entries.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.chunk.id < b.chunk.id ? -1 : a.chunk.id > b.chunk.id ? 1 : 0;
    });

    const chunks: RetrievedChunk[] = entries
      .slice(0, validated.limit)
      .map((entry) => ({ chunk: entry.chunk, score: entry.score }));

    return { query: validated.query, chunks };
  }

  private applyReciprocalRanks(
    fused: Map<string, FusedEntry>,
    chunks: RetrievedChunk[],
  ): void {
    chunks.forEach((retrieved, index) => {
      const rank = index + 1;
      const contribution = 1 / (RRF_K + rank);
      const existing = fused.get(retrieved.chunk.id);
      if (existing) {
        existing.score += contribution;
      } else {
        fused.set(retrieved.chunk.id, {
          chunk: retrieved.chunk,
          score: contribution,
        });
      }
    });
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
