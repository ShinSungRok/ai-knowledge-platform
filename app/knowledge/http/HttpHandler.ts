import type { HttpRequest } from "./HttpRequest";
import type { HttpResponse } from "./HttpResponse";

/**
 * Handles a single HTTP request and returns a response.
 */
export type HttpHandler = (request: HttpRequest) => Promise<HttpResponse>;
