/**
 * Custom JWT claim carrying the workspace scope for AuthZ.
 */
export const JWT_CLAIM_WORKSPACE_ID = "workspace_id" as const;

/**
 * Minimum validated JWT claims for {@link JwtVerifier}.
 */
export type JwtClaims = {
  sub: string;
  workspaceId: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
};
