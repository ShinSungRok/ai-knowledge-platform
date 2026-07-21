/**
 * Inbound OTLP/HTTP response shape for {@link OtlpHttpTransport}.
 */
export type OtlpHttpResponse = {
  status: number;
  body: string;
};
