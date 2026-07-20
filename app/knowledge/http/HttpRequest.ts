import type { HttpMethod } from "./HttpMethod";

/**
 * Framework-independent HTTP request.
 */
export interface HttpRequest {
  method: HttpMethod;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
}
