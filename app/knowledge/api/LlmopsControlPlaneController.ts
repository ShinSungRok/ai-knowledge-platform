import type {
  LlmopsControlPlaneServingLabels,
  RunLlmopsControlPlaneUseCase,
} from "../application/RunLlmopsControlPlaneUseCase";
import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";
import type { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkspaceAuthorizer } from "../security/WorkspaceAuthorizer";
import type { EvaluationGateDefinitionStore } from "../llmops/EvaluationGateDefinitionStore";
import type { EvaluationGateRule } from "../llmops/EvaluationGateRule";
import { asExperimentRunId } from "../llmops/ExperimentRunId";
import type { ExperimentRunStore } from "../llmops/ExperimentRunStore";
import type { LlmopsObservationStore } from "../llmops/LlmopsObservationStore";
import type { ModelRegistry } from "../llmops/ModelRegistry";
import type { PromptRegistry } from "../llmops/PromptRegistry";
import type { ServingConfigStore } from "../llmops/ServingConfigStore";
import type { ServingEnvironment } from "../llmops/ServingEnvironment";

const JSON_HEADERS = { "content-type": "application/json" } as const;

export const LLMOPS_CONTROL_PLANE_PATH =
  /^\/workspaces\/([^/]+)\/llmops\/control-plane$/;
export const LLMOPS_EXPERIMENT_RUN_BY_ID_PATH =
  /^\/workspaces\/([^/]+)\/llmops\/experiment-runs\/([^/]+)$/;
export const LLMOPS_PROMPTS_PATH =
  /^\/workspaces\/([^/]+)\/llmops\/prompts$/;
export const LLMOPS_MODELS_PATH =
  /^\/workspaces\/([^/]+)\/llmops\/models$/;
export const LLMOPS_EVALUATION_GATES_PATH =
  /^\/workspaces\/([^/]+)\/llmops\/evaluation-gates$/;
export const LLMOPS_SERVING_CONFIGS_PATH =
  /^\/workspaces\/([^/]+)\/llmops\/serving-configs$/;
export const LLMOPS_OBSERVATIONS_PATH =
  /^\/workspaces\/([^/]+)\/llmops\/observations$/;

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

function isBadRequestMessage(message: string): boolean {
  return (
    message.includes("must be a non-empty string") ||
    message.includes("must be a plain object") ||
    message.includes("must be a finite number") ||
    message.includes("must be a string") ||
    message.includes("must be a non-empty array") ||
    message.includes("must be an array") ||
    message.includes('must be "')
  );
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
  const promptTemplateDescription = parseOptionalString(
    record.promptTemplateDescription,
    "servingLabels.promptTemplateDescription",
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
  if (promptTemplateDescription !== undefined) {
    labels.promptTemplateDescription = promptTemplateDescription;
  }
  return labels;
}

function parseGateRules(
  raw: unknown,
): readonly EvaluationGateRule[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("gateRules must be a non-empty array");
  }
  for (const rule of raw) {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      throw new Error("gateRules entries must be plain objects");
    }
    const r = rule as Record<string, unknown>;
    if (typeof r.metricKey !== "string" || r.metricKey.trim().length === 0) {
      throw new Error("gateRules[].metricKey must be a non-empty string");
    }
    if (!["gte", "lte", "eq"].includes(r.comparator as string)) {
      throw new Error('gateRules[].comparator must be "gte" | "lte" | "eq"');
    }
    if (typeof r.threshold !== "number" || !Number.isFinite(r.threshold)) {
      throw new Error("gateRules[].threshold must be a finite number");
    }
  }
  return raw as EvaluationGateRule[];
}

/**
 * HTTP controller for the thin LLMOps control-plane story (P4) plus
 * read-only inspection routes for each persisted capability. AuthN via
 * {@link HttpBearerGuard}, then AuthZ via {@link WorkspaceAuthorizer} —
 * same pattern as {@link WorkflowRunController}.
 */
export class LlmopsControlPlaneController {
  constructor(
    private readonly runControlPlane: RunLlmopsControlPlaneUseCase,
    private readonly bearerGuard: HttpBearerGuard,
    private readonly workspaceAuthorizer: WorkspaceAuthorizer,
    private readonly runs?: ExperimentRunStore,
    private readonly prompts?: PromptRegistry,
    private readonly models?: ModelRegistry,
    private readonly gateDefinitions?: EvaluationGateDefinitionStore,
    private readonly serving?: ServingConfigStore,
    private readonly observations?: LlmopsObservationStore,
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
    let environment: ServingEnvironment | undefined;
    let trafficPercent: number | undefined;
    let gateRules: readonly EvaluationGateRule[] | undefined;
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
        gateRules = parseGateRules(record.gateRules);
      } catch (error: unknown) {
        return jsonResponse(400, { error: errorMessage(error) });
      }
      if (record.environment !== undefined) {
        if (typeof record.environment !== "string") {
          return jsonResponse(400, { error: "environment must be a string" });
        }
        environment = record.environment as ServingEnvironment;
      }
      if (record.trafficPercent !== undefined) {
        if (typeof record.trafficPercent !== "number") {
          return jsonResponse(400, {
            error: "trafficPercent must be a number",
          });
        }
        trafficPercent = record.trafficPercent;
      }
    }

    try {
      const result = await this.runControlPlane.execute({
        workspaceId,
        ...(metrics !== undefined ? { metrics } : {}),
        ...(servingLabels !== undefined ? { servingLabels } : {}),
        ...(environment !== undefined ? { environment } : {}),
        ...(trafficPercent !== undefined ? { trafficPercent } : {}),
        ...(gateRules !== undefined ? { gateRules } : {}),
      });
      return jsonResponse(200, result);
    } catch (error: unknown) {
      const message = errorMessage(error);
      if (isBadRequestMessage(message)) {
        return jsonResponse(400, { error: message });
      }
      return jsonResponse(500, { error: message });
    }
  }

  async getExperimentRun(request: HttpRequest): Promise<HttpResponse> {
    const pathMatch = LLMOPS_EXPERIMENT_RUN_BY_ID_PATH.exec(request.path);
    if (pathMatch === null || this.runs === undefined) {
      return jsonResponse(404, { error: "Not Found" });
    }
    if (request.method !== "GET") {
      return jsonResponse(405, { error: "Method Not Allowed" });
    }
    const workspaceId = pathMatch[1]!;
    const auth = await this.authorize(request, workspaceId);
    if (auth !== null) {
      return auth;
    }
    try {
      const record = await this.runs.getById(
        workspaceId,
        asExperimentRunId(pathMatch[2]!),
      );
      if (record === null) {
        return jsonResponse(404, { error: "Not Found" });
      }
      return jsonResponse(200, record);
    } catch (error: unknown) {
      return jsonResponse(500, { error: errorMessage(error) });
    }
  }

  async listPrompts(request: HttpRequest): Promise<HttpResponse> {
    const pathMatch = LLMOPS_PROMPTS_PATH.exec(request.path);
    if (pathMatch === null || this.prompts === undefined) {
      return jsonResponse(404, { error: "Not Found" });
    }
    if (request.method !== "GET") {
      return jsonResponse(405, { error: "Method Not Allowed" });
    }
    const workspaceId = pathMatch[1]!;
    const auth = await this.authorize(request, workspaceId);
    if (auth !== null) {
      return auth;
    }
    try {
      const templates = await this.prompts.listTemplates(workspaceId);
      return jsonResponse(200, { templates });
    } catch (error: unknown) {
      return jsonResponse(500, { error: errorMessage(error) });
    }
  }

  async listModels(request: HttpRequest): Promise<HttpResponse> {
    const pathMatch = LLMOPS_MODELS_PATH.exec(request.path);
    if (pathMatch === null || this.models === undefined) {
      return jsonResponse(404, { error: "Not Found" });
    }
    if (request.method !== "GET") {
      return jsonResponse(405, { error: "Method Not Allowed" });
    }
    const workspaceId = pathMatch[1]!;
    const auth = await this.authorize(request, workspaceId);
    if (auth !== null) {
      return auth;
    }
    try {
      const models = await this.models.listModels(workspaceId);
      return jsonResponse(200, { models });
    } catch (error: unknown) {
      return jsonResponse(500, { error: errorMessage(error) });
    }
  }

  async listEvaluationGates(request: HttpRequest): Promise<HttpResponse> {
    const pathMatch = LLMOPS_EVALUATION_GATES_PATH.exec(request.path);
    if (pathMatch === null || this.gateDefinitions === undefined) {
      return jsonResponse(404, { error: "Not Found" });
    }
    if (request.method !== "GET") {
      return jsonResponse(405, { error: "Method Not Allowed" });
    }
    const workspaceId = pathMatch[1]!;
    const auth = await this.authorize(request, workspaceId);
    if (auth !== null) {
      return auth;
    }
    try {
      const gates = await this.gateDefinitions.listByWorkspace(workspaceId);
      return jsonResponse(200, { gates });
    } catch (error: unknown) {
      return jsonResponse(500, { error: errorMessage(error) });
    }
  }

  async listServingConfigs(request: HttpRequest): Promise<HttpResponse> {
    const pathMatch = LLMOPS_SERVING_CONFIGS_PATH.exec(request.path);
    if (pathMatch === null || this.serving === undefined) {
      return jsonResponse(404, { error: "Not Found" });
    }
    if (request.method !== "GET") {
      return jsonResponse(405, { error: "Method Not Allowed" });
    }
    const workspaceId = pathMatch[1]!;
    const auth = await this.authorize(request, workspaceId);
    if (auth !== null) {
      return auth;
    }
    try {
      const servingConfigs = await this.serving.listByWorkspace(workspaceId);
      return jsonResponse(200, { servingConfigs });
    } catch (error: unknown) {
      return jsonResponse(500, { error: errorMessage(error) });
    }
  }

  async listObservations(request: HttpRequest): Promise<HttpResponse> {
    const pathMatch = LLMOPS_OBSERVATIONS_PATH.exec(request.path);
    if (pathMatch === null || this.observations === undefined) {
      return jsonResponse(404, { error: "Not Found" });
    }
    if (request.method !== "GET") {
      return jsonResponse(405, { error: "Method Not Allowed" });
    }
    const workspaceId = pathMatch[1]!;
    const auth = await this.authorize(request, workspaceId);
    if (auth !== null) {
      return auth;
    }
    try {
      const observations = await this.observations.listByWorkspace(workspaceId);
      return jsonResponse(200, { observations });
    } catch (error: unknown) {
      return jsonResponse(500, { error: errorMessage(error) });
    }
  }

  private async authorize(
    request: HttpRequest,
    workspaceId: string,
  ): Promise<HttpResponse | null> {
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
    return null;
  }
}
