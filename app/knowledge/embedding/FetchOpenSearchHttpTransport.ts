import type { OpenSearchHttpRequest } from "./OpenSearchHttpRequest";
import type { OpenSearchHttpResponse } from "./OpenSearchHttpResponse";
import type { OpenSearchHttpTransport } from "./OpenSearchHttpTransport";

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ status: number; text(): Promise<string> }>;

/**
 * Node built-in `fetch` adapter for {@link OpenSearchHttpTransport}.
 * Joins constructor `baseUrl` with relative `request.path`. Injectable
 * `fetchImpl` supports validation without a live cluster.
 */
export class FetchOpenSearchHttpTransport implements OpenSearchHttpTransport {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: FetchLike = fetch as FetchLike,
  ) {}

  async send(request: OpenSearchHttpRequest): Promise<OpenSearchHttpResponse> {
    const root = this.baseUrl.replace(/\/+$/, "");
    const path = request.path.startsWith("/") ? request.path : `/${request.path}`;
    const response = await this.fetchImpl(`${root}${path}`, {
      method: request.method,
      headers: request.headers ? { ...request.headers } : undefined,
      body: request.body,
    });
    const body = await response.text();
    return { status: response.status, body };
  }
}
