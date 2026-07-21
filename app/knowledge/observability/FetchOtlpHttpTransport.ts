import type { OtlpHttpRequest } from "./OtlpHttpRequest";
import type { OtlpHttpResponse } from "./OtlpHttpResponse";
import type { OtlpHttpTransport } from "./OtlpHttpTransport";

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ status: number; text(): Promise<string> }>;

/**
 * Node built-in `fetch` adapter for {@link OtlpHttpTransport}.
 * `request.path` is treated as a full URL (endpoint + signal path).
 * Injectable `fetchImpl` supports Fake validation without network.
 */
export class FetchOtlpHttpTransport implements OtlpHttpTransport {
  constructor(private readonly fetchImpl: FetchLike = fetch as FetchLike) {}

  async send(request: OtlpHttpRequest): Promise<OtlpHttpResponse> {
    const response = await this.fetchImpl(request.path, {
      method: request.method,
      headers: { ...request.headers },
      body: request.body,
    });
    const body = await response.text();
    return { status: response.status, body };
  }
}
