import type { KnowledgeRuntime } from "../composition/KnowledgeRuntime";
import { DefaultHttpRouter } from "../http/DefaultHttpRouter";
import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";
import type { HttpRouter } from "../http/HttpRouter";
import type { McpJsonRpcHandler } from "../mcp/McpJsonRpcHandler";
import type { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkspaceAuthorizer } from "../security/WorkspaceAuthorizer";
import type { WorkflowAgentRegistry } from "../workflow/WorkflowAgentRegistry";
import type { WorkflowOrchestrator } from "../workflow/WorkflowOrchestrator";
import type { WorkflowMemoryStore } from "../workflow/WorkflowMemoryStore";
import type { WorkflowRunStore } from "../workflow/WorkflowRunStore";
import type { EvaluationGateDefinitionStore } from "../llmops/EvaluationGateDefinitionStore";
import type { ExperimentRunStore } from "../llmops/ExperimentRunStore";
import type { LlmopsObservationStore } from "../llmops/LlmopsObservationStore";
import type { ModelRegistry } from "../llmops/ModelRegistry";
import type { PromptRegistry } from "../llmops/PromptRegistry";
import type { ServingConfigStore } from "../llmops/ServingConfigStore";
import type { RunLlmopsControlPlaneUseCase } from "../application/RunLlmopsControlPlaneUseCase";
import { RunWorkflowUseCase } from "../application/RunWorkflowUseCase";
import { CitedGroundedAnswerController } from "./CitedGroundedAnswerController";
import { HealthController } from "./HealthController";
import {
  LLMOPS_CONTROL_PLANE_PATH,
  LLMOPS_EVALUATION_GATES_PATH,
  LLMOPS_EXPERIMENT_RUN_BY_ID_PATH,
  LLMOPS_MODELS_PATH,
  LLMOPS_OBSERVATIONS_PATH,
  LLMOPS_PROMPTS_PATH,
  LLMOPS_SERVING_CONFIGS_PATH,
  LlmopsControlPlaneController,
} from "./LlmopsControlPlaneController";
import { McpJsonRpcController } from "./McpJsonRpcController";
import { WORKFLOW_AGENTS_PATH, WorkflowAgentController } from "./WorkflowAgentController";
import {
  WORKFLOW_RUN_BY_ID_PATH,
  WORKFLOW_RUN_MEMORY_PATH,
  WORKFLOW_RUN_PATH,
  WorkflowRunController,
} from "./WorkflowRunController";

const CITED_ANSWER_PATH = /^\/workspaces\/[^/]+\/cited-answers$/;

export type CreateKnowledgeHttpRouterOptions = {
  /** When set, registers Bearer-protected POST .../workflow-runs. */
  workflowOrchestrator?: WorkflowOrchestrator;
  /** When set (with workflowOrchestrator), also registers GET .../workflow-runs/:id. */
  workflowRunStore?: WorkflowRunStore;
  /** When set (with workflowOrchestrator), also registers GET .../workflow-runs/:id/memory. */
  workflowMemoryStore?: WorkflowMemoryStore;
  /** When set, registers Bearer-protected GET .../workflow-agents (Role Contract, process-global). */
  workflowAgentRegistry?: WorkflowAgentRegistry;
  /** When set, registers Bearer-protected POST .../llmops/control-plane. */
  runLlmopsControlPlane?: RunLlmopsControlPlaneUseCase;
  /** When set (with runLlmopsControlPlane), also registers GET .../llmops/experiment-runs/:id. */
  llmopsExperimentRunStore?: ExperimentRunStore;
  /** When set (with runLlmopsControlPlane), also registers GET .../llmops/prompts. */
  llmopsPromptRegistry?: PromptRegistry;
  /** When set (with runLlmopsControlPlane), also registers GET .../llmops/models. */
  llmopsModelRegistry?: ModelRegistry;
  /** When set (with runLlmopsControlPlane), also registers GET .../llmops/evaluation-gates. */
  llmopsGateDefinitionStore?: EvaluationGateDefinitionStore;
  /** When set (with runLlmopsControlPlane), also registers GET .../llmops/serving-configs. */
  llmopsServingConfigStore?: ServingConfigStore;
  /** When set (with runLlmopsControlPlane), also registers GET .../llmops/observations. */
  llmopsObservationStore?: LlmopsObservationStore;
};

/**
 * Registers health + cited-answer + MCP JSON-RPC (+ optional workflow / llmops).
 * Protected routes require Bearer AuthN then workspace AuthZ.
 * Health does not require authentication.
 */
export function createKnowledgeHttpRouter(
  runtime: KnowledgeRuntime,
  bearerGuard: HttpBearerGuard,
  workspaceAuthorizer: WorkspaceAuthorizer,
  mcpHandler: McpJsonRpcHandler,
  options: CreateKnowledgeHttpRouterOptions = {},
): HttpRouter {
  const health = new HealthController();
  const citedAnswers = new CitedGroundedAnswerController(
    runtime,
    bearerGuard,
    workspaceAuthorizer,
  );
  const mcp = new McpJsonRpcController(
    mcpHandler,
    bearerGuard,
    workspaceAuthorizer,
  );
  const workflowRuns =
    options.workflowOrchestrator !== undefined
      ? new WorkflowRunController(
          new RunWorkflowUseCase(
            options.workflowOrchestrator,
            options.workflowRunStore,
          ),
          bearerGuard,
          workspaceAuthorizer,
          options.workflowRunStore,
          options.workflowMemoryStore,
        )
      : null;
  const workflowAgents =
    options.workflowAgentRegistry !== undefined
      ? new WorkflowAgentController(
          options.workflowAgentRegistry,
          bearerGuard,
          workspaceAuthorizer,
        )
      : null;
  const llmopsControlPlane =
    options.runLlmopsControlPlane !== undefined
      ? new LlmopsControlPlaneController(
          options.runLlmopsControlPlane,
          bearerGuard,
          workspaceAuthorizer,
          options.llmopsExperimentRunStore,
          options.llmopsPromptRegistry,
          options.llmopsModelRegistry,
          options.llmopsGateDefinitionStore,
          options.llmopsServingConfigStore,
          options.llmopsObservationStore,
        )
      : null;
  const exactRouter = new DefaultHttpRouter([
    {
      method: "GET",
      path: "/health",
      handler: (request) => health.check(request),
    },
    {
      method: "POST",
      path: "/mcp",
      handler: (request) => mcp.handle(request),
    },
  ]);

  return {
    async handle(request: HttpRequest): Promise<HttpResponse> {
      if (CITED_ANSWER_PATH.test(request.path)) {
        return citedAnswers.create(request);
      }
      if (workflowRuns !== null && WORKFLOW_RUN_PATH.test(request.path)) {
        return workflowRuns.create(request);
      }
      if (workflowRuns !== null && WORKFLOW_RUN_BY_ID_PATH.test(request.path)) {
        return workflowRuns.getById(request);
      }
      if (workflowRuns !== null && WORKFLOW_RUN_MEMORY_PATH.test(request.path)) {
        return workflowRuns.getMemory(request);
      }
      if (workflowAgents !== null && WORKFLOW_AGENTS_PATH.test(request.path)) {
        return workflowAgents.list(request);
      }
      if (
        llmopsControlPlane !== null &&
        LLMOPS_CONTROL_PLANE_PATH.test(request.path)
      ) {
        return llmopsControlPlane.create(request);
      }
      if (
        llmopsControlPlane !== null &&
        LLMOPS_EXPERIMENT_RUN_BY_ID_PATH.test(request.path)
      ) {
        return llmopsControlPlane.getExperimentRun(request);
      }
      if (llmopsControlPlane !== null && LLMOPS_PROMPTS_PATH.test(request.path)) {
        return llmopsControlPlane.listPrompts(request);
      }
      if (llmopsControlPlane !== null && LLMOPS_MODELS_PATH.test(request.path)) {
        return llmopsControlPlane.listModels(request);
      }
      if (
        llmopsControlPlane !== null &&
        LLMOPS_EVALUATION_GATES_PATH.test(request.path)
      ) {
        return llmopsControlPlane.listEvaluationGates(request);
      }
      if (
        llmopsControlPlane !== null &&
        LLMOPS_SERVING_CONFIGS_PATH.test(request.path)
      ) {
        return llmopsControlPlane.listServingConfigs(request);
      }
      if (
        llmopsControlPlane !== null &&
        LLMOPS_OBSERVATIONS_PATH.test(request.path)
      ) {
        return llmopsControlPlane.listObservations(request);
      }
      return exactRouter.handle(request);
    },
  };
}
