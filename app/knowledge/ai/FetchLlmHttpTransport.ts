import type { LlmHttpRequest } from "./LlmHttpRequest";
import type { LlmHttpResponse } from "./LlmHttpResponse";
import type { LlmHttpTransport } from "./LlmHttpTransport";

/**
 * Node built-in `fetch` adapter for {@link LlmHttpTransport}.
 * Used only when composition selects the HTTP LLM path; never imported
 * by application use cases.
 */
export class FetchLlmHttpTransport implements LlmHttpTransport {
  async fetch(request: LlmHttpRequest): Promise<LlmHttpResponse> {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    const bodyText = await response.text();
    return { status: response.status, bodyText };
  }
}
