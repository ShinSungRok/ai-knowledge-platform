/**
 * Module: `app/knowledge/security`
 *
 * Authentication and workspace authorization for Operations.
 *
 * `Authenticator` / `AuthPrincipal` define AuthN (credentials → principal).
 * `WorkspaceAuthorizer` / `DefaultWorkspaceAuthorizer` enforce principal
 * workspace equality (AuthZ). `HttpWorkspaceGuard` reads `x-workspace-id`
 * for legacy header AuthZ. JWT/OIDC SDKs, rate limiting, and CORS remain
 * deferred.
 */
export const KNOWLEDGE_MODULE_SECURITY = "app/knowledge/security" as const;

export type { AuthPrincipal } from "./AuthPrincipal";
export type { Authenticator } from "./Authenticator";
export type { WorkspaceAuthorizer } from "./WorkspaceAuthorizer";
export { DefaultWorkspaceAuthorizer } from "./DefaultWorkspaceAuthorizer";
export { HttpWorkspaceGuard } from "./HttpWorkspaceGuard";
