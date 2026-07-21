import type { JwtClaims } from "./JwtClaims";

/**
 * Result of a successful {@link JwtVerifier.verify} call.
 */
export type VerifiedJwt = {
  claims: JwtClaims;
  rawPayload: Readonly<Record<string, unknown>>;
};
