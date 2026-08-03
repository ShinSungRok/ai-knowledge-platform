import type { RunWorkflowUseCase } from "../application/RunWorkflowUseCase";
import { toWorkflowRunResultView } from "../application/RunWorkflowUseCase";
import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";
import type { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkspaceAuthorizer } from "../security/WorkspaceAuthorizer";
import { asWorkflowRunId } from "../workflow/WorkflowRunId";
import type { WorkflowMemoryStore } from "../workflow/WorkflowMemoryStore";
import type { WorkflowRunStore } from "../workflow/WorkflowRunStore";

const JSON_HEADERS = { "content-type": "application/json" } as const;

export const WORKFLOW_RUN_PATH =
  /^\/workspaces\/([^/]+)\/workflow-runs$/;
export const WORKFLOW_RUN_BY_ID_PATH =
  /^\/workspaces\/([^/]+)\/workflow-runs\/([^/]+)$/;
export const WORKFLOW_RUN_MEMORY_PATH =
  /^\/workspaces\/([^/]+)\/workflow-runs\/([^/]+)\/memory$/;

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

function parseMetadata(
  raw: unknown,
): Readonly<Record<string, string>> | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("metadata must be a plain object");
  }
  const record = raw as Record<string, unknown>;
  const metadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== "string") {
      throw new Error(`metadata.${key} must be a string`);
    }
    metadata[key] = value;
  }
  return metadata;
}

/**
 * HTTP controller for thin Multi-Agent workflow runs (P3 Later).
 * AuthN via {@link HttpBearerGuard}, then AuthZ via {@link WorkspaceAuthorizer}.
 * Same pattern as {@link CitedGroundedAnswerController}.
 */
export class WorkflowRunController {
  constructor(
    private readonly runWorkflow: RunWorkflowUseCase,
    private readonly bearerGuard: HttpBearerGuard,
    private readonly workspaceAuthorizer: WorkspaceAuthorizer,
    private readonly runStore?: WorkflowRunStore,
    private readonly memoryStore?: WorkflowMemoryStore,
  ) {}

  async create(request: HttpRequest): Promise<HttpResponse> {
    const pathMatch = WORKFLOW_RUN_PATH.exec(request.path);
    if (pathMatch === null) {
      return jsonResponse(404, { error: "Not Found" });
    }
    if (request.method !== "POST") {
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

    const body = request.body;
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse(400, { error: "body must be a plain object" });
    }

    const record = body as Record<string, unknown>;
    if (typeof record.objective !== "string") {
      return jsonResponse(400, { error: "objective must be a string" });
    }
    if (record.objective.trim().length === 0) {
      return jsonResponse(400, { error: "objective must be a non-empty string" });
    }

    let metadata: Readonly<Record<string, string>> | undefined;
    try {
      metadata = parseMetadata(record.metadata);
    } catch (error: unknown) {
      return jsonResponse(400, { error: errorMessage(error) });
    }

    try {
      const result = await this.runWorkflow.execute({
        workspaceId,
        objective: record.objective,
        ...(metadata !== undefined ? { metadata } : {}),
      });
      return jsonResponse(200, result);
    } catch (error: unknown) {
      const message = errorMessage(error);
      if (
        message.includes("must be a non-empty string") ||
        message.includes("must be an object")
      ) {
        return jsonResponse(400, { error: message });
      }
      return jsonResponse(500, { error: message });
    }
  }

  async getById(request: HttpRequest): Promise<HttpResponse> {
    const pathMatch = WORKFLOW_RUN_BY_ID_PATH.exec(request.path);
    if (pathMatch === null || this.runStore === undefined) {
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
      const record = await this.runStore.getById(
        workspaceId,
        asWorkflowRunId(pathMatch[2]!),
      );
      if (record === null) {
        return jsonResponse(404, { error: "Not Found" });
      }
      return jsonResponse(
        200,
        toWorkflowRunResultView(
          record.workspaceId,
          record.objective,
          record.result,
        ),
      );
    } catch (error: unknown) {
      return jsonResponse(500, { error: errorMessage(error) });
    }
  }

  async getMemory(request: HttpRequest): Promise<HttpResponse> {
    const pathMatch = WORKFLOW_RUN_MEMORY_PATH.exec(request.path);
    if (pathMatch === null || this.memoryStore === undefined) {
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
      const workflowRunId = asWorkflowRunId(pathMatch[2]!);
      const entries = await this.memoryStore.listByRun(
        workspaceId,
        workflowRunId,
      );
      return jsonResponse(200, { workflowRunId: String(workflowRunId), entries });
    } catch (error: unknown) {
      return jsonResponse(500, { error: errorMessage(error) });
    }
  }
}
