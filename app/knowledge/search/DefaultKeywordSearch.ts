import type { DocumentChunk } from "../domain/DocumentChunk";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult, RetrievedChunk } from "../retrieval/RetrievalResult";
import type { KeywordSearch } from "./KeywordSearch";

/** Matches maximal runs of Unicode letters/numbers — the token unit for both query and chunk text. */
const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;

function tokenize(text: string): string[] {
  const matches = text.match(TOKEN_PATTERN);
  if (!matches) {
    return [];
  }
  return matches.map((token) => token.toLowerCase());
}

/**
 * Default {@link KeywordSearch} adapter: deterministic exact-token-match
 * lexical ranking over every chunk in a workspace.
 *
 * Depends only on the `DocumentChunkRepository` port — never a concrete
 * adapter, `VectorIndex`, or `EmbeddingProvider`. Both `query` and each
 * candidate chunk's `text` are tokenized into maximal runs of Unicode
 * letters/numbers and lowercased; the query's tokens are de-duplicated,
 * and a chunk's score is the sum, over each unique query token, of how
 * many times that exact token appears in the chunk. Chunks scoring 0 are
 * excluded. Results are sorted by score descending, then chunk `id`
 * ascending as a deterministic tie-break, and capped at `limit`.
 */
export class DefaultKeywordSearch implements KeywordSearch {
  constructor(private readonly documentChunkRepository: DocumentChunkRepository) {}

  async search(input: RetrievalInput): Promise<RetrievalResult> {
    const { workspaceId, query, limit } = this.toInput(input);

    const queryTokens = Array.from(new Set(tokenize(query)));
    const allChunks = await this.documentChunkRepository.findAll(workspaceId);

    const scored: RetrievedChunk[] = [];
    for (const chunk of allChunks) {
      const score = this.scoreChunk(chunk, queryTokens);
      if (score > 0) {
        scored.push({ chunk, score });
      }
    }

    scored.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.chunk.id < b.chunk.id ? -1 : a.chunk.id > b.chunk.id ? 1 : 0;
    });

    return { query, chunks: scored.slice(0, limit) };
  }

  private scoreChunk(chunk: DocumentChunk, queryTokens: string[]): number {
    if (queryTokens.length === 0) {
      return 0;
    }
    const chunkTokenCounts = new Map<string, number>();
    for (const token of tokenize(chunk.text)) {
      chunkTokenCounts.set(token, (chunkTokenCounts.get(token) ?? 0) + 1);
    }

    let score = 0;
    for (const queryToken of queryTokens) {
      score += chunkTokenCounts.get(queryToken) ?? 0;
    }
    return score;
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
