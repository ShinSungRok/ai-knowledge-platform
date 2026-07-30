/**
 * Default minimum {@link LlmRerankedSearch} score (LLM judgment / 10,
 * so 0..1) a candidate must reach to survive a second pass of
 * {@link ThresholdFilteringRerankedSearch} applied after LLM judging.
 * `0.4` treats an LLM relevance score of 4/10 or higher as real evidence
 * — low enough to admit a partial/tangential match, high enough to
 * reject a candidate the LLM itself judged as not actually answering
 * the question, closing the gap `MIN_VECTOR_SIMILARITY`/
 * `MIN_KEYWORD_COVERAGE` cannot: those operate on lossy vector/token
 * signals and cannot always tell a true match from a merely
 * similar-sounding one.
 */
export const MIN_LLM_RELEVANCE_SCORE = 0.4;
