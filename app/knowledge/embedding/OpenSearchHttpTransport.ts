import type { OpenSearchHttpRequest } from "./OpenSearchHttpRequest";
import type { OpenSearchHttpResponse } from "./OpenSearchHttpResponse";

/**
 * Port for dependency-free OpenSearch REST I/O.
 *
 * Concrete adapters (fake, Node `fetch`) live under embedding/composition.
 * Official OpenSearch JS SDK is not required by this contract.
 */
export interface OpenSearchHttpTransport {
  send(request: OpenSearchHttpRequest): Promise<OpenSearchHttpResponse>;
}
