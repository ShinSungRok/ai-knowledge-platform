import type { AuthPrincipal } from "./AuthPrincipal";
import type { Authenticator } from "./Authenticator";
import type { JwtVerifier } from "./JwtVerifier";

/**
 * {@link Authenticator} backed by a {@link JwtVerifier} (typically HS256).
 */
export class Hs256JwtAuthenticator implements Authenticator {
  constructor(private readonly verifier: JwtVerifier) {}

  async authenticate(credentials: { token: string }): Promise<AuthPrincipal> {
    const verified = await this.verifier.verify(credentials.token);
    return {
      subject: verified.claims.sub,
      workspaceId: verified.claims.workspaceId,
    };
  }
}
