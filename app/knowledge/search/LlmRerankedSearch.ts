import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import type { GroundedPrompt } from "../prompt/GroundedPrompt";
import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult, RetrievedChunk } from "../retrieval/RetrievalResult";
import type { RerankedSearch } from "./RerankedSearch";

const SYSTEM_INSTRUCTION =
  'You are a strict relevance judge. You will be given a question and several ' +
  "numbered candidate passages. For each candidate, output exactly one line in " +
  'the form "N: score" where N is the candidate number and score is an integer ' +
  "from 0 (not relevant at all) to 10 (directly and fully answers the question). " +
  "Output only these lines, one per candidate, in order, nothing else.";

/** Matches a standalone "N: score" line — anchored so it never matches a stray colon inside echoed passage text. */
const SCORE_LINE_PATTERN = /^\s*(\d+)\s*:\s*(-?\d+(?:\.\d+)?)\s*$/gm;

/**
 * {@link RerankedSearch} decorator: re-scores an already-ranked, already-
 * filtered candidate set by asking a {@link LanguageModelProvider} to
 * judge each candidate's relevance directly against the query text, in
 * one combined call.
 *
 * This exists because vector/keyword similarity — no matter how well
 * tuned — cannot reliably disambiguate cases where an irrelevant
 * candidate happens to share surface-level phrasing with the query while
 * the true match does not (observed empirically: a false-positive law
 * article scored *higher* cosine similarity than the correct one for a
 * reworded query). An LLM reading the full question and full passage
 * side by side resolves this kind of ambiguity directly, instead of
 * comparing lossy fixed-size vectors.
 *
 * Meant as the last stage after cheaper vector/keyword filtering has
 * already bounded the candidate set — it costs one additional LLM call
 * per search, scaling with however many candidates survive upstream.
 *
 * Degrades gracefully: a candidate whose score line the LLM's response
 * doesn't include, or that isn't parseable, keeps its incoming score
 * unchanged rather than being penalized. Against the default fake
 * language model adapter (which echoes the prompt back verbatim,
 * containing no "N: score" lines), this parses nothing and returns the
 * inner search's own ranking as a no-op — the same behavior as if this
 * stage weren't present.
 *
 * Depends only on the `RerankedSearch`/`LanguageModelProvider` ports —
 * never a concrete adapter.
 */
export class LlmRerankedSearch implements RerankedSearch {
  constructor(
    private readonly inner: RerankedSearch,
    private readonly languageModelProvider: LanguageModelProvider,
  ) {}

  async search(input: RetrievalInput): Promise<RetrievalResult> {
    const result = await this.inner.search(input);
    if (result.chunks.length === 0) {
      return result;
    }

    const prompt = this.buildPrompt(result.query, result.chunks);
    const generated = await this.languageModelProvider.generate(prompt);
    const scores = this.parseScores(generated.text, result.chunks.length);

    const rescored: RetrievedChunk[] = result.chunks.map((retrieved, index) => {
      const llmScore = scores[index];
      return {
        chunk: retrieved.chunk,
        score: llmScore !== undefined ? llmScore / 10 : retrieved.score,
      };
    });

    rescored.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.chunk.id < b.chunk.id ? -1 : a.chunk.id > b.chunk.id ? 1 : 0;
    });

    return { query: result.query, chunks: rescored };
  }

  private buildPrompt(query: string, chunks: RetrievedChunk[]): GroundedPrompt {
    const passages = chunks
      .map((retrieved, index) => `${index + 1}) ${retrieved.chunk.text}`)
      .join("\n\n");
    return {
      systemInstruction: SYSTEM_INSTRUCTION,
      userMessage: `Question:\n${query}\n\nCandidates:\n${passages}`,
    };
  }

  private parseScores(text: string, count: number): Array<number | undefined> {
    const scores: Array<number | undefined> = new Array(count).fill(undefined);
    let match: RegExpExecArray | null;
    SCORE_LINE_PATTERN.lastIndex = 0;
    while ((match = SCORE_LINE_PATTERN.exec(text)) !== null) {
      const index = Number(match[1]) - 1;
      const rawScore = Number(match[2]);
      if (index >= 0 && index < count && Number.isFinite(rawScore)) {
        scores[index] = Math.max(0, Math.min(10, rawScore));
      }
    }
    return scores;
  }
}
