import type { KnowledgeRuntime } from "../composition/KnowledgeRuntime";
import { DefaultHttpRouter } from "../http/DefaultHttpRouter";
import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";
import type { HttpRouter } from "../http/HttpRouter";
import type { McpJsonRpcHandler } from "../mcp/McpJsonRpcHandler";
import type { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkspaceAuthorizer } from "../security/WorkspaceAuthorizer";
import type { WorkflowOrchestrator } from "../workflow/WorkflowOrchestrator";
import type { RunLlmopsControlPlaneUseCase } from "../application/RunLlmopsControlPlaneUseCase";
import { RunWorkflowUseCase } from "../application/RunWorkflowUseCase";
import { CitedGroundedAnswerController } from "./CitedGroundedAnswerController";
import { HealthController } from "./HealthController";
import {
  LLMOPS_CONTROL_PLANE_PATH,
  LlmopsControlPlaneController,
} from "./LlmopsControlPlaneController";
import { McpJsonRpcController } from "./McpJsonRpcController";
import {
  WORKFLOW_RUN_PATH,
  WorkflowRunController,
} from "./WorkflowRunController";

const CITED_ANSWER_PATH = /^\/workspaces\/[^/]+\/cited-answers$/;

export type CreateKnowledgeHttpRouterOptions = {
  /** When set, registers Bearer-protected POST .../workflow-runs. */
  workflowOrchestrator?: WorkflowOrchestrator;
  /** When set, registers Bearer-protected POST .../llmops/control-plane. */
  runLlmopsControlPlane?: RunLlmopsControlPlaneUseCase;
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
          new RunWorkflowUseCase(options.workflowOrchestrator),
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
      if (
        llmopsControlPlane !== null &&
        LLMOPS_CONTROL_PLANE_PATH.test(request.path)
      ) {
        return llmopsControlPlane.create(request);
      }
      return exactRouter.handle(request);
    },
  };
}
