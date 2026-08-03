/**
 * Maximum total {@link RerankedSearch.search} attempts in
 * {@link RetryingRerankedSearch} (1 initial attempt + 2 retries).
 *
 * Exists because the LLM-judged reranking stage is a borderline call for
 * some queries: real-LLM testing against law.go.kr data found a query
 * whose single correct matching article scored just under the relevance
 * threshold on roughly 20–40% of otherwise-identical attempts (same
 * embeddings, same candidates — the LLM's own judgment varied run to
 * run, even at `temperature: 0`, which reduces but does not eliminate
 * this on real hosted providers). Retrying only when the *entire*
 * pipeline returns zero chunks — never on a thrown error — costs one
 * extra hybrid+LLM-judged pass for genuinely irrelevant queries too, but
 * meaningfully raises the odds of surfacing a real match that one
 * attempt alone would have missed.
 */
export const MAX_RERANK_RETRY_ATTEMPTS = 3;
