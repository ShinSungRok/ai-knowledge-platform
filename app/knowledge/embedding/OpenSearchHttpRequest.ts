/**
 * Outbound OpenSearch HTTP request for {@link OpenSearchHttpTransport}.
 */
export type OpenSearchHttpRequest = {
  method: "GET" | "PUT" | "POST" | "DELETE" | "HEAD";
  path: string;
  headers?: Readonly<Record<string, string>>;
  body?: string;
};
