/**
 * Framework-independent HTTP response.
 */
export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body?: unknown;
}
