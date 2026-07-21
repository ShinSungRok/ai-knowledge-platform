import type { JwksDocument } from "./JwksDocument";
import type { JwksHttpRequest } from "./JwksHttpRequest";
import type { JwksHttpResponse } from "./JwksHttpResponse";
import type { JwksHttpTransport } from "./JwksHttpTransport";

/**
 * In-memory JWKS HTTP transport for RS256 JWT validation.
 */
export class FakeJwksHttpTransport implements JwksHttpTransport {
  readonly requests: JwksHttpRequest[] = [];

  constructor(private readonly document: JwksDocument) {}

  async send(request: JwksHttpRequest): Promise<JwksHttpResponse> {
    this.requests.push({
      method: request.method,
      url: request.url,
      ...(request.headers ? { headers: { ...request.headers } } : {}),
    });
    return {
      status: 200,
      body: JSON.stringify(this.document),
    };
  }
}
