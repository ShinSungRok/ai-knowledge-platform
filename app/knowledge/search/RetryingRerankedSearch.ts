import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult } from "../retrieval/RetrievalResult";
import type { RerankedSearch } from "./RerankedSearch";

/**
 * {@link RerankedSearch} decorator: retries the wrapped search up to
 * `maxAttempts` times when it returns zero chunks, before giving up.
 *
 * Only an empty (`chunks.length === 0`) *successful* result triggers a
 * retry — a thrown error still propagates immediately on the first
 * occurrence, never retried here. See {@link MAX_RERANK_RETRY_ATTEMPTS}
 * for why this exists (LLM-judged reranking is a borderline call for
 * some queries, even at low sampling temperature).
 */
export class RetryingRerankedSearch implements RerankedSearch {
  constructor(
    private readonly inner: RerankedSearch,
    private readonly maxAttempts: number,
  ) {
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
      throw new Error(
        "RetryingRerankedSearch maxAttempts must be a positive integer",
      );
    }
  }

  async search(input: RetrievalInput): Promise<RetrievalResult> {
    let last: RetrievalResult | undefined;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      last = await this.inner.search(input);
      if (last.chunks.length > 0) {
        return last;
      }
    }
    return last!;
  }
}
