import type { EmbeddingHttpRequest } from "./EmbeddingHttpRequest";
import type { EmbeddingHttpResponse } from "./EmbeddingHttpResponse";

/**
 * Port for dependency-free embedding HTTP I/O.
 *
 * Concrete adapters (fake, Node `fetch`, etc.) live under
 * `app/knowledge/embedding` and are never imported by application use
 * cases. No official embedding SDK is required by this contract.
 */
export interface EmbeddingHttpTransport {
  fetch(request: EmbeddingHttpRequest): Promise<EmbeddingHttpResponse>;
}
