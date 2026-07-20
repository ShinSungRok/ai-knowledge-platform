/**
 * Module: `app/knowledge/security`
 *
 * Workspace authorization and HTTP request guards for Operations.
 *
 * `WorkspaceAuthorizer` / `DefaultWorkspaceAuthorizer` enforce principal
 * workspace equality. `HttpWorkspaceGuard` reads `x-workspace-id` and
 * delegates to the authorizer. AuthN (JWT/OIDC), rate limiting, and CORS
 * remain out of scope.
 */
export const KNOWLEDGE_MODULE_SECURITY = "app/knowledge/security" as const;

export type { WorkspaceAuthorizer } from "./WorkspaceAuthorizer";
export { DefaultWorkspaceAuthorizer } from "./DefaultWorkspaceAuthorizer";
export { HttpWorkspaceGuard } from "./HttpWorkspaceGuard";
