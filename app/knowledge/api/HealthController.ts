import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";

const JSON_HEADERS = { "content-type": "application/json" } as const;

/**
 * Health check controller: `GET /health` → `{ status: "ok" }`.
 */
export class HealthController {
  async check(request: HttpRequest): Promise<HttpResponse> {
    if (request.method !== "GET" || request.path !== "/health") {
      return {
        status: 404,
        headers: { ...JSON_HEADERS },
        body: { error: "Not Found" },
      };
    }
    return {
      status: 200,
      headers: { ...JSON_HEADERS },
      body: { status: "ok" },
    };
  }
}
