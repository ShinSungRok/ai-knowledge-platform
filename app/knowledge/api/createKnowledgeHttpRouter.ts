import type { KnowledgeRuntime } from "../composition/KnowledgeRuntime";
import { DefaultHttpRouter } from "../http/DefaultHttpRouter";
import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";
import type { HttpRouter } from "../http/HttpRouter";
import type { McpJsonRpcHandler } from "../mcp/McpJsonRpcHandler";
import type { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkspaceAuthorizer } from "../security/WorkspaceAuthorizer";
import type { WorkflowOrchestrator } from "../workflow/WorkflowOrchestrator";
import { RunWorkflowUseCase } from "../application/RunWorkflowUseCase";
import { CitedGroundedAnswerController } from "./CitedGroundedAnswerController";
import { HealthController } from "./HealthController";
import { McpJsonRpcController } from "./McpJsonRpcController";
import {
  WORKFLOW_RUN_PATH,
  WorkflowRunController,
} from "./WorkflowRunController";

const CITED_ANSWER_PATH = /^\/workspaces\/[^/]+\/cited-answers$/;

export type CreateKnowledgeHttpRouterOptions = {
  /** When set, registers Bearer-protected POST .../workflow-runs. */
  workflowOrchestrator?: WorkflowOrchestrator;
};

/**
 * Registers health + cited-answer + MCP JSON-RPC routes (+ optional workflow-runs).
 * Cited-answer, `/mcp`, and workflow-runs require Bearer AuthN then workspace AuthZ.
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
      return exactRouter.handle(request);
    },
  };
}
