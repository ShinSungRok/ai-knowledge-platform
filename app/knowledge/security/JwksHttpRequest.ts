/**
 * Outbound JWKS HTTP request for {@link JwksHttpTransport}.
 */
export type JwksHttpRequest = {
  method: "GET";
  url: string;
  headers?: Readonly<Record<string, string>>;
};
