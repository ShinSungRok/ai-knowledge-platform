import type { VerifiedJwt } from "./VerifiedJwt";

/**
 * Dependency-free JWT verification port.
 *
 * Concrete adapters (HS256, RS256/JWKS) live under `security`. Official
 * `jsonwebtoken` / `jose` / passport SDKs are not required.
 */
export interface JwtVerifier {
  verify(token: string): Promise<VerifiedJwt>;
}
