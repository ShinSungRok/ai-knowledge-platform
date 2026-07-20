/**
 * Module: `app/knowledge/api`
 *
 * Controllers and HTTP route registration for the knowledge runtime.
 *
 * `HealthController` serves `GET /health` without authentication.
 * `CitedGroundedAnswerController` serves
 * `POST /workspaces/{workspaceId}/cited-answers` with Bearer AuthN
 * ({@link HttpBearerGuard}) then workspace AuthZ ({@link WorkspaceAuthorizer}).
 * `createKnowledgeHttpRouter(runtime, bearerGuard, workspaceAuthorizer)` wires
 * both onto a framework-independent {@link HttpRouter}.
 */
export const KNOWLEDGE_MODULE_API = "app/knowledge/api" as const;

export { HealthController } from "./HealthController";
export { CitedGroundedAnswerController } from "./CitedGroundedAnswerController";
export { createKnowledgeHttpRouter } from "./createKnowledgeHttpRouter";
