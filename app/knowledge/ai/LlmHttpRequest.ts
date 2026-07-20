/**
 * Outbound HTTP request shape for {@link LlmHttpTransport}.
 */
export type LlmHttpRequest = {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
};
