import type { EmbeddingHttpRequest } from "./EmbeddingHttpRequest";
import type { EmbeddingHttpResponse } from "./EmbeddingHttpResponse";
import type { EmbeddingHttpTransport } from "./EmbeddingHttpTransport";

/**
 * Node built-in `fetch` adapter for {@link EmbeddingHttpTransport}.
 * Used only when composition selects the HTTP embedding path; never
 * imported by application use cases.
 */
export class FetchEmbeddingHttpTransport implements EmbeddingHttpTransport {
  async fetch(request: EmbeddingHttpRequest): Promise<EmbeddingHttpResponse> {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    const bodyText = await response.text();
    return { status: response.status, bodyText };
  }
}
