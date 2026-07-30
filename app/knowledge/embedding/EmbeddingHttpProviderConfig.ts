/**
 * Configuration for an OpenAI-compatible HTTP {@link EmbeddingProvider}.
 *
 * `baseUrl` is the API root (e.g. `https://api.openai.com/v1`, or a local
 * Ollama instance's OpenAI-compatible root). `dimensions` is optional —
 * when set, it is forwarded as the request's `dimensions` field so a
 * Matryoshka-trained model (e.g. `text-embedding-3-small`) returns a
 * vector matching this project's fixed `EMBEDDING_VECTOR_DIMENSION`.
 */
export type EmbeddingHttpProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  dimensions?: number;
};
