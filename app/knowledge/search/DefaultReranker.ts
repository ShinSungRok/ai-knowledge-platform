import type { RetrievedChunk } from "../retrieval/RetrievalResult";
import type { Reranker } from "./Reranker";
import type { RerankingInput } from "./RerankingInput";
import { tokenize } from "./tokenize";

interface RelevanceSignal {
  coverage: number;
  density: number;
}

/**
 * Default {@link Reranker} adapter: deterministic relevance re-ranking of
 * an already-retrieved candidate set, using only the query text and each
 * candidate's own chunk text — no framework, repository, provider, or
 * concrete adapter dependency, and no constructor dependency at all.
 *
 * For each candidate, computes two signals over the same Unicode
 * letter/number lowercased tokenization the keyword search adapter
 * uses: **coverage**, the fraction of the query's unique tokens that
 * appear at least once in the chunk (0 when the query or chunk has no
 * tokens), and **density**, the fraction of the chunk's own tokens that
 * are occurrences of a query token (i.e. term frequency of the query
 * within the chunk, 0 under the same empty-token conditions). The
 * reranked score is `coverage + density + <the candidate's original
 * retrieved score>`, so a candidate that already ranked well going in
 * keeps some of that advantage rather than being scored from scratch.
 * Results sort by reranked score descending, then chunk `id` ascending
 * as a deterministic tie-break. Every candidate is returned — re-ranking
 * never drops one — and neither the input array nor its `RetrievedChunk`
 * elements are mutated; the returned entries are fresh objects.
 */
export class DefaultReranker implements Reranker {
  async rerank(input: RerankingInput): Promise<RetrievedChunk[]> {
    const validated = this.toInput(input);
    const queryTokens = Array.from(new Set(tokenize(validated.query)));

    const reranked: RetrievedChunk[] = validated.chunks.map((retrieved) => {
      const { coverage, density } = this.scoreRelevance(
        retrieved.chunk.text,
        queryTokens,
      );
      return {
        chunk: { ...retrieved.chunk },
        score: coverage + density + retrieved.score,
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
