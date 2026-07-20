/**
 * Authenticated principal produced by {@link Authenticator}.
 * AuthN only — workspace access comparison is {@link WorkspaceAuthorizer}.
 */
export type AuthPrincipal = {
  subject: string;
  workspaceId: string;
};
