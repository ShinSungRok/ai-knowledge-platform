import { EMBEDDING_VECTOR_DIMENSION } from "./EmbeddingVectorDimension";
import type { EmbeddingProvider } from "./EmbeddingProvider";

/**
 * Deterministic, dependency-free {@link EmbeddingProvider} for validation
 * and early composition wiring — no external AI provider, API key, or
 * network call.
 *
 * Splits `text` into Unicode code points (via `Array.from`, so astral
 * characters/surrogate pairs are never split mid-code-point), accumulates
 * each code point's numeric value into one of {@link
 * EMBEDDING_VECTOR_DIMENSION} buckets (`index % EMBEDDING_VECTOR_DIMENSION`),
 * then divides every bucket by the code point count — always yielding a
 * vector of exactly `EMBEDDING_VECTOR_DIMENSION` finite numbers. Rejects an
 * empty or whitespace-only string, since there is no code point to derive a
 * vector from.
 */
export class FakeEmbeddingProvider implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    this.assertText(text);

    const codePoints = Array.from(text);
    const buckets = new Array(EMBEDDING_VECTOR_DIMENSION).fill(0);
    for (let i = 0; i < codePoints.length; i += 1) {
      const codePointValue = codePoints[i]?.codePointAt(0) ?? 0;
      buckets[i % EMBEDDING_VECTOR_DIMENSION] += codePointValue;
    }

    return buckets.map((sum) => sum / codePoints.length);
  }

  private assertText(text: string): void {
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new Error(
        "EmbeddingProvider.embed text must be a non-empty, non-whitespace string",
      );
    }
  }
}
