import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";
import type { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkspaceAuthorizer } from "../security/WorkspaceAuthorizer";
import type { WorkflowAgentRegistry } from "../workflow/WorkflowAgentRegistry";

const JSON_HEADERS = { "content-type": "application/json" } as const;

export const WORKFLOW_AGENTS_PATH =
  /^\/workspaces\/([^/]+)\/workflow-agents$/;

function jsonResponse(status: number, body: unknown): HttpResponse {
  return {
    status,
    headers: { ...JSON_HEADERS },
    body,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "Internal Server Error";
}

/**
 * Read-only HTTP view of the Multi-Agent Role Contract registry
 * (P3 Later). AuthN via {@link HttpBearerGuard}, then AuthZ via
 * {@link WorkspaceAuthorizer} — same pattern as {@link WorkflowRunController}.
 *
 * {@link WorkflowAgentRegistry} is process-global, not workspace-scoped:
 * every authorized workspace sees the same registered agent list. The
 * `:workspaceId` path segment only gates AuthZ, it does not filter agents.
 */
export class WorkflowAgentController {
  constructor(
    private readonly registry: WorkflowAgentRegistry,
    private readonly bearerGuard: HttpBearerGuard,
    private readonly workspaceAuthorizer: WorkspaceAuthorizer,
  ) {}

  async list(request: HttpRequest): Promise<HttpResponse> {
    const pathMatch = WORKFLOW_AGENTS_PATH.exec(request.path);
    if (pathMatch === null) {
      return jsonResponse(404, { error: "Not Found" });
    }
    if (request.method !== "GET") {
      return jsonResponse(405, { error: "Method Not Allowed" });
    }

    const workspaceId = pathMatch[1]!;

    let principal;
    try {
      principal = await this.bearerGuard.authenticateRequest(request);
    } catch (error: unknown) {
      return jsonResponse(401, { error: errorMessage(error) });
    }

    try {
      this.workspaceAuthorizer.authorize({
        workspaceId,
        principalWorkspaceId: principal.workspaceId,
      });
    } catch (error: unknown) {
      return jsonResponse(403, { error: errorMessage(error) });
    }

    try {
      const agents = this.registry.listAll().map((agent) => agent.descriptor);
      return jsonResponse(200, { agents });
    } catch (error: unknown) {
      return jsonResponse(500, { error: errorMessage(error) });
    }
  }
}
