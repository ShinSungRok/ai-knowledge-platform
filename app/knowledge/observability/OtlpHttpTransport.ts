import type { OtlpHttpRequest } from "./OtlpHttpRequest";
import type { OtlpHttpResponse } from "./OtlpHttpResponse";

/**
 * Port for dependency-free OTLP/HTTP I/O.
 *
 * Concrete adapters (fake, Node `fetch`) live under observability or
 * composition. Official OpenTelemetry SDKs are not required by this contract.
 */
export interface OtlpHttpTransport {
  send(request: OtlpHttpRequest): Promise<OtlpHttpResponse>;
}
