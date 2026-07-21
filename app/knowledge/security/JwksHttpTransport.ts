import type { JwksHttpRequest } from "./JwksHttpRequest";
import type { JwksHttpResponse } from "./JwksHttpResponse";

/**
 * Port for dependency-free JWKS endpoint HTTP I/O.
 */
export interface JwksHttpTransport {
  send(request: JwksHttpRequest): Promise<JwksHttpResponse>;
}
