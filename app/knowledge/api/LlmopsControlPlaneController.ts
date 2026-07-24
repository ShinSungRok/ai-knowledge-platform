import type {
  LlmopsControlPlaneServingLabels,
  RunLlmopsControlPlaneUseCase,
} from "../application/RunLlmopsControlPlaneUseCase";
import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";
import type { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkspaceAuthorizer } from "../security/WorkspaceAuthorizer";

const JSON_HEADERS = { "content-type": "application/json" } as const;

export const LLMOPS_CONTROL_PLANE_PATH =
  /^\/workspaces\/([^/]+)\/llmops\/control-plane$/;

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

function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  return value;
}

function parseServingLabels(
  raw: unknown,
): LlmopsControlPlaneServingLabels | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("servingLabels must be a plain object");
  }
  const record = raw as Record<string, unknown>;
  const labels: LlmopsControlPlaneServingLabels = {};
  const modelName = parseOptionalString(record.modelName, "servingLabels.modelName");
  const providerModel = parseOptionalString(
    record.providerModel,
    "servingLabels.providerModel",
  );
  const promptTemplateName = parseOptionalString(
    record.promptTemplateName,
    "servingLabels.promptTemplateName",
  );
  const promptBody = parseOptionalString(
    record.promptBody,
    "servingLabels.promptBody",
  );
  if (modelName !== undefined) {
    labels.modelName = modelName;
  }
  if (providerModel !== undefined) {
    labels.providerModel = providerModel;
  }
  if (promptTemplateName !== undefined) {
    labels.promptTemplateName = promptTemplateName;
  }
  if (promptBody !== undefined) {
    labels.promptBody = promptBody;
  }
  return labels;
}

/**
 * HTTP controller for thin LLMOps control-plane story (P4 Later).
 * AuthN via {@link HttpBearerGuard}, then AuthZ via {@link WorkspaceAuthorizer}.
 */
export class LlmopsControlPlaneController {
  constructor(
    private readonly runControlPlane: RunLlmopsControlPlaneUseCase,
    private readonly bearerGuard: HttpBearerGuard,
    private readonly workspaceAuthorizer: WorkspaceAuthorizer,
  ) {}

  async create(request: HttpRequest): Promise<HttpResponse> {
    const pathMatch = LLMOPS_CONTROL_PLANE_PATH.exec(request.path);
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
    let metrics: Record<string, number> | undefined;
    let servingLabels: LlmopsControlPlaneServingLabels | undefined;
    if (body !== undefined && body !== null) {
      if (typeof body !== "object" || Array.isArray(body)) {
        return jsonResponse(400, { error: "body must be a plain object" });
      }
      const record = body as Record<string, unknown>;
      if (record.metrics !== undefined) {
        if (
          record.metrics === null ||
          typeof record.metrics !== "object" ||
          Array.isArray(record.metrics)
        ) {
          return jsonResponse(400, {
            error: "metrics must be a plain object of numbers",
          });
        }
        const parsed: Record<string, number> = {};
        for (const [key, value] of Object.entries(
          record.metrics as Record<string, unknown>,
        )) {
          if (typeof value !== "number" || !Number.isFinite(value)) {
            return jsonResponse(400, {
              error: `metrics.${key} must be a finite number`,
            });
          }
          parsed[key] = value;
        }
        metrics = parsed;
      }
      try {
        servingLabels = parseServingLabels(record.servingLabels);
      } catch (error: unknown) {
        return jsonResponse(400, { error: errorMessage(error) });
      }
    }

    try {
      const result = await this.runControlPlane.execute({
        workspaceId,
        ...(metrics !== undefined ? { metrics } : {}),
        ...(servingLabels !== undefined ? { servingLabels } : {}),
      });
      return jsonResponse(200, result);
    } catch (error: unknown) {
      const message = errorMessage(error);
      if (
        message.includes("must be a non-empty string") ||
        message.includes("must be a plain object") ||
        message.includes("must be a finite number") ||
        message.includes("must be a string")
      ) {
        return jsonResponse(400, { error: message });
      }
      return jsonResponse(500, { error: message });
    }
  }
}
