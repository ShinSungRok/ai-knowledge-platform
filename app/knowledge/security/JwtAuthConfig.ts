/**
 * Configuration for dependency-free JWT verification.
 */
export type JwtAuthConfig =
  | {
      type: "hs256";
      secret: string;
      issuer?: string;
      audience?: string;
    }
  | {
      type: "jwks";
      jwksUrl: string;
      issuer?: string;
      audience?: string;
    };
