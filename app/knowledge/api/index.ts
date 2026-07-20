/**
 * Module: `app/knowledge/api`
 *
 * Controllers and HTTP route registration for the knowledge runtime.
 *
 * `HealthController` serves `GET /health`. `CitedGroundedAnswerController`
 * serves `POST /workspaces/{workspaceId}/cited-answers` and depends only
 * on {@link KnowledgeRuntime}. `createKnowledgeHttpRouter` wires both
 * onto a framework-independent {@link HttpRouter}.
 */
export const KNOWLEDGE_MODULE_API = "app/knowledge/api" as const;

export { HealthController } from "./HealthController";
export { CitedGroundedAnswerController } from "./CitedGroundedAnswerController";
export { createKnowledgeHttpRouter } from "./createKnowledgeHttpRouter";
