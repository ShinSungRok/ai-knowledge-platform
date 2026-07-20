import type { HttpRequest } from "../http/HttpRequest";
import type { WorkspaceAuthorizer } from "./WorkspaceAuthorizer";

const WORKSPACE_HEADER = "x-workspace-id";

/**
 * HTTP request guard that enforces workspace authorization via the
 * `x-workspace-id` header (matched case-insensitively on header names).
 */
export class HttpWorkspaceGuard {
  constructor(private readonly authorizer: WorkspaceAuthorizer) {}

  assertRequest(request: HttpRequest, workspaceId: string): void {
    const headerValue = readHeader(request.headers, WORKSPACE_HEADER);
    if (headerValue === undefined || headerValue.trim().length === 0) {
      throw new Error("Missing x-workspace-id header");
    }
    this.authorizer.authorize({
      workspaceId,
      principalWorkspaceId: headerValue,
    });
  }
}

function readHeader(
  headers: Record<string, string>,
  name: string,
): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return undefined;
}
