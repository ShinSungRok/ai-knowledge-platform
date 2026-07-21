import type { JwksHttpRequest } from "./JwksHttpRequest";
import type { JwksHttpResponse } from "./JwksHttpResponse";
import type { JwksHttpTransport } from "./JwksHttpTransport";

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string> },
) => Promise<{ status: number; text(): Promise<string> }>;

/**
 * Node built-in `fetch` adapter for {@link JwksHttpTransport}.
 */
export class FetchJwksHttpTransport implements JwksHttpTransport {
  constructor(private readonly fetchImpl: FetchLike = fetch as FetchLike) {}

  async send(request: JwksHttpRequest): Promise<JwksHttpResponse> {
    const response = await this.fetchImpl(request.url, {
      method: request.method,
      headers: request.headers ? { ...request.headers } : undefined,
    });
    const body = await response.text();
    return { status: response.status, body };
  }
}
