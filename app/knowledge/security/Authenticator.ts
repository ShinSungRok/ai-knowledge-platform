import type { AuthPrincipal } from "./AuthPrincipal";

/**
 * Authenticates credentials into an {@link AuthPrincipal}.
 * Invalid/unknown credentials throw (recommended: `"Authentication failed"`).
 * Does not perform workspace authorization — that is {@link WorkspaceAuthorizer}.
 */
export interface Authenticator {
  authenticate(credentials: { token: string }): Promise<AuthPrincipal>;
}
