/**
 * Inbound HTTP response shape for {@link EmbeddingHttpTransport}.
 */
export type EmbeddingHttpResponse = {
  status: number;
  bodyText: string;
};
