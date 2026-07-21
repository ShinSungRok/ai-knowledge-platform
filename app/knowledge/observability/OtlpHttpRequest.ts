/**
 * Outbound OTLP/HTTP request shape for {@link OtlpHttpTransport}.
 */
export type OtlpHttpRequest = {
  method: "POST";
  path: string;
  headers: Readonly<Record<string, string>>;
  body: string;
};
