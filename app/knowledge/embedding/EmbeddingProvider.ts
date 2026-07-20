/**
 * Port for producing a fixed-{@link EMBEDDING_VECTOR_DIMENSION}-dimension
 * embedding vector for a piece of text.
 *
 * `embed` performs no storage or indexing — it only describes the
 * text-to-vector transformation. Concrete implementations (a dependency-
 * free fake, and later real AI providers) live under
 * `app/knowledge/embedding` and are wired only at the composition root;
 * `application` and `domain` never import a concrete provider.
 */
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}
