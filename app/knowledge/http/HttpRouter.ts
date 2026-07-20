import type { HttpRequest } from "./HttpRequest";
import type { HttpResponse } from "./HttpResponse";

/**
 * Dispatches an HTTP request to a registered handler.
 */
export interface HttpRouter {
  handle(request: HttpRequest): Promise<HttpResponse>;
}
