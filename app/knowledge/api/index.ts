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
  WORKFLOW_RUN_BY_ID_PATH,
  WORKFLOW_RUN_MEMORY_PATH,
} from "./WorkflowRunController";
export {
  WorkflowAgentController,
  WORKFLOW_AGENTS_PATH,
} from "./WorkflowAgentController";
export {
  LlmopsControlPlaneController,
  LLMOPS_CONTROL_PLANE_PATH,
  LLMOPS_EXPERIMENT_RUN_BY_ID_PATH,
  LLMOPS_PROMPTS_PATH,
  LLMOPS_MODELS_PATH,
  LLMOPS_EVALUATION_GATES_PATH,
  LLMOPS_SERVING_CONFIGS_PATH,
  LLMOPS_OBSERVATIONS_PATH,
} from "./LlmopsControlPlaneController";
export {
  createKnowledgeHttpRouter,
  type CreateKnowledgeHttpRouterOptions,
} from "./createKnowledgeHttpRouter";
