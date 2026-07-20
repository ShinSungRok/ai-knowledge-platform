/**
 * Inbound HTTP response shape for {@link LlmHttpTransport}.
 */
export type LlmHttpResponse = {
  status: number;
  bodyText: string;
};
