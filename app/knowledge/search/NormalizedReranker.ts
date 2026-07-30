import type { RetrievedChunk } from "../retrieval/RetrievalResult";
import type { Reranker } from "./Reranker";
import type { RerankingInput } from "./RerankingInput";
import { tokenize } from "./tokenize";

interface RelevanceSignal {
  coverage: number;
  density: number;
}

/**
 * Maximum possible reciprocal-rank-fusion score a candidate can carry
 * into reranking: both `HybridSearch` sources (vector, keyword) ranking
 * the same chunk first, `1/(60+1) + 1/(60+1)`. Matches the RRF smoothing
 * constant used by the default `HybridSearch` adapter.
 */
const MAX_RRF_SCORE = 2 / 61;

/** Default weight for the normalized vector-retrieval signal (0..1). */
const DEFAULT_VECTOR_WEIGHT = 0.5;

/**
 * {@link Reranker} adapter that fixes a scale mismatch left by the
 * default reranker adapter: it sums raw keyword coverage/density (0..1
 * each) directly with `HybridSearch`'s RRF-fused score (0..~0.033), so
 * the vector-retrieval signal is numerically ~60x smaller than the
 * keyword signal and barely affects the final ranking regardless of
 * embedding quality.
 *
 * This adapter normalizes both signals onto the same 0..1 scale before
 * combining them — `vectorSignal` divides the incoming `retrieved.score`
 * by {@link MAX_RRF_SCORE} (clamped to 1 in case a future `HybridSearch`
 * adapter yields a higher ceiling), `keywordSignal` averages coverage and
 * density the same way the default reranker adapter computes them — then takes a
 * weighted average, `vectorWeight * vectorSignal + (1 - vectorWeight) *
 * keywordSignal`, so a real embedding upgrade actually moves the final
 * score proportionally to its weight instead of being swamped.
 *
 * No framework, repository, provider, or search/context adapter
 * dependency, and no constructor dependency beyond the optional weight.
 */
export class NormalizedReranker implements Reranker {
  constructor(private readonly vectorWeight: number = DEFAULT_VECTOR_WEIGHT) {
    if (
      typeof vectorWeight !== "number" ||
      !Number.isFinite(vectorWeight) ||
      vectorWeight < 0 ||
      vectorWeight > 1
    ) {
      throw new Error("NormalizedReranker vectorWeight must be a number between 0 and 1");
    }
  }

  async rerank(input: RerankingInput): Promise<RetrievedChunk[]> {
    const validated = this.toInput(input);
    const queryTokens = Array.from(new Set(tokenize(validated.query)));

    const reranked: RetrievedChunk[] = validated.chunks.map((retrieved) => {
      const { coverage, density } = this.scoreRelevance(
        retrieved.chunk.text,
        queryTokens,
      );
      const vectorSignal = Math.min(1, Math.max(0, retrieved.score / MAX_RRF_SCORE));
      const keywordSignal = (coverage + density) / 2;
      const score =
        this.vectorWeight * vectorSignal + (1 - this.vectorWeight) * keywordSignal;
      return {
        chunk: { ...retrieved.chunk },
        score,
      };
    });

    reranked.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.chunk.id < b.chunk.id ? -1 : a.chunk.id > b.chunk.id ? 1 : 0;
    });

    return reranked;
  }

  private scoreRelevance(
    chunkText: string,
    queryTokens: string[],
  ): RelevanceSignal {
    const chunkTokens = tokenize(chunkText);
    if (queryTokens.length === 0 || chunkTokens.length === 0) {
      return { coverage: 0, density: 0 };
    }

    const chunkTokenCounts = new Map<string, number>();
    for (const token of chunkTokens) {
      chunkTokenCounts.set(token, (chunkTokenCounts.get(token) ?? 0) + 1);
    }

    let matchedDistinctTokens = 0;
    let matchedOccurrences = 0;
    for (const queryToken of queryTokens) {
      const occurrences = chunkTokenCounts.get(queryToken) ?? 0;
      if (occurrences > 0) {
        matchedDistinctTokens += 1;
        matchedOccurrences += occurrences;
      }
    }

    return {
      coverage: matchedDistinctTokens / queryTokens.length,
      density: matchedOccurrences / chunkTokens.length,
    };
  }

  private toInput(input: RerankingInput): RerankingInput {
    if (!input || typeof input !== "object") {
      throw new Error("RerankingInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error("RerankingInput.workspaceId must be a non-empty string");
    }
    if (typeof input.query !== "string" || input.query.trim().length === 0) {
      throw new Error("RerankingInput.query must be a non-empty string");
    }
    if (!Array.isArray(input.chunks)) {
      throw new Error("RerankingInput.chunks must be an array");
    }
    for (const retrieved of input.chunks) {
      this.assertRetrievedChunk(retrieved);
    }
    return {
      workspaceId: input.workspaceId,
      query: input.query,
      chunks: input.chunks,
    };
  }

  private assertRetrievedChunk(retrieved: RetrievedChunk): void {
    if (!retrieved || typeof retrieved !== "object") {
      throw new Error("RetrievedChunk must be an object");
    }
    if (typeof retrieved.score !== "number" || !Number.isFinite(retrieved.score)) {
      throw new Error("RetrievedChunk.score must be a finite number");
    }
    const chunk = retrieved.chunk;
    if (!chunk || typeof chunk !== "object") {
      throw new Error("RetrievedChunk.chunk must be an object");
    }
    this.assertNonEmptyString(chunk.workspaceId, "chunk.workspaceId");
    this.assertNonEmptyString(chunk.id, "chunk.id");
    this.assertNonEmptyString(chunk.documentId, "chunk.documentId");
    if (typeof chunk.text !== "string") {
      throw new Error("RetrievedChunk.chunk.text must be a string");
    }
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`RetrievedChunk.${field} must be a non-empty string`);
    }
  }
}
