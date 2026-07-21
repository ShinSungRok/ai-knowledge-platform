/**
 * Module: `app/knowledge/security`
 *
 * Authentication and workspace authorization for Operations.
 *
 * `Authenticator` / `AuthPrincipal` define AuthN (credentials → principal).
 * `WorkspaceAuthorizer` / `DefaultWorkspaceAuthorizer` enforce principal
 * workspace equality (AuthZ). `HttpWorkspaceGuard` reads `x-workspace-id`
 * for legacy header AuthZ.
 *
 * Dependency-free JWT verification (`JwtVerifier`, `loadJwtAuthConfig`);
 * no jsonwebtoken/jose/passport SDK. Full OIDC login flows remain deferred.
 */
export const KNOWLEDGE_MODULE_SECURITY = "app/knowledge/security" as const;

export type { AuthPrincipal } from "./AuthPrincipal";
export type { Authenticator } from "./Authenticator";
export type { ApiKeyPrincipalEntry } from "./ApiKeyAuthenticator";
export type { WorkspaceAuthorizer } from "./WorkspaceAuthorizer";
export type { JwtClaims } from "./JwtClaims";
export { JWT_CLAIM_WORKSPACE_ID } from "./JwtClaims";
export type { VerifiedJwt } from "./VerifiedJwt";
export type { JwtVerifier } from "./JwtVerifier";
export type { JwtAuthConfig } from "./JwtAuthConfig";
export { loadJwtAuthConfig } from "./loadJwtAuthConfig";
export { Hs256JwtVerifier } from "./Hs256JwtVerifier";
export { Hs256JwtAuthenticator } from "./Hs256JwtAuthenticator";
export { ApiKeyAuthenticator } from "./ApiKeyAuthenticator";
export { DefaultWorkspaceAuthorizer } from "./DefaultWorkspaceAuthorizer";
export { HttpBearerGuard } from "./HttpBearerGuard";
export { HttpWorkspaceGuard } from "./HttpWorkspaceGuard";
