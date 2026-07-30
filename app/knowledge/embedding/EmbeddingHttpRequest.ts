/**
 * Outbound HTTP request shape for {@link EmbeddingHttpTransport}.
 */
export type EmbeddingHttpRequest = {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
};
