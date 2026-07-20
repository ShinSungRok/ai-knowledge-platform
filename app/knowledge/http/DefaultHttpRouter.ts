import type { HttpHandler } from "./HttpHandler";
import type { HttpMethod } from "./HttpMethod";
import type { HttpRequest } from "./HttpRequest";
import type { HttpResponse } from "./HttpResponse";
import type { HttpRouter } from "./HttpRouter";

export interface HttpRoute {
  method: HttpMethod;
  path: string;
  handler: HttpHandler;
}

const NOT_FOUND: HttpResponse = {
  status: 404,
  headers: { "content-type": "application/json" },
  body: { error: "Not Found" },
};

/**
 * Exact method+path dispatch. Unknown routes return a JSON 404.
 */
export class DefaultHttpRouter implements HttpRouter {
  private readonly routes: readonly HttpRoute[];

  constructor(routes: readonly HttpRoute[]) {
    this.routes = routes;
  }

  async handle(request: HttpRequest): Promise<HttpResponse> {
    for (const route of this.routes) {
      if (route.method === request.method && route.path === request.path) {
        return route.handler(request);
      }
    }
    return {
      status: NOT_FOUND.status,
      headers: { ...NOT_FOUND.headers },
      body: NOT_FOUND.body,
    };
  }
}
