/**
 * Module: `app/knowledge/api`
 *
 * Controllers and HTTP route registration for the knowledge runtime.
 *
 * `HealthController` serves `GET /health` without authentication.
 * `CitedGroundedAnswerController` serves
 * `POST /workspaces/{workspaceId}/cited-answers` with Bearer AuthN
 * ({@link HttpBearerGuard}) then workspace AuthZ ({@link WorkspaceAuthorizer}).
 * `McpJsonRpcController` serves `POST /mcp` JSON-RPC (`tools/list` /
 * `tools/call`) with Bearer AuthN and workspace AuthZ on tools/call.
 * `createKnowledgeHttpRouter` wires routes onto a framework-independent
 * {@link HttpRouter}.
 */
export const KNOWLEDGE_MODULE_API = "app/knowledge/api" as const;

export { HealthController } from "./HealthController";
export { CitedGroundedAnswerController } from "./CitedGroundedAnswerController";
export { McpJsonRpcController } from "./McpJsonRpcController";
export {
  WorkflowRunController,
  WORKFLOW_RUN_PATH,
} from "./WorkflowRunController";
export {
  createKnowledgeHttpRouter,
  type CreateKnowledgeHttpRouterOptions,
} from "./createKnowledgeHttpRouter";
