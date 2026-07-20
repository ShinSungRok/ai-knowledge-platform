import type { LlmHttpRequest } from "./LlmHttpRequest";
import type { LlmHttpResponse } from "./LlmHttpResponse";

/**
 * Port for dependency-free LLM HTTP I/O.
 *
 * Concrete adapters (fake, Node `fetch`, etc.) live under `app/knowledge/ai`
 * or composition and are never imported by application use cases.
 * No official LLM SDK is required by this contract.
 */
export interface LlmHttpTransport {
  fetch(request: LlmHttpRequest): Promise<LlmHttpResponse>;
}
