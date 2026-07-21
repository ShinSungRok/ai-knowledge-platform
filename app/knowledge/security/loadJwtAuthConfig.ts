import type { JwtAuthConfig } from "./JwtAuthConfig";

/**
 * Loads {@link JwtAuthConfig} from environment-like records.
 * Returns `null` when neither `JWT_SECRET` nor `JWT_JWKS_URL` is set.
 */
export function loadJwtAuthConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): JwtAuthConfig | null {
  const secret = env["JWT_SECRET"];
  if (secret !== undefined && secret.trim().length > 0) {
    const config: JwtAuthConfig = {
      type: "hs256",
      secret: secret.trim(),
    };
    const issuer = trimOptional(env["JWT_ISSUER"]);
    const audience = trimOptional(env["JWT_AUDIENCE"]);
    if (issuer !== undefined) {
      config.issuer = issuer;
    }
    if (audience !== undefined) {
      config.audience = audience;
    }
    return config;
  }

  const jwksUrl = env["JWT_JWKS_URL"];
  if (jwksUrl !== undefined && jwksUrl.trim().length > 0) {
    const config: JwtAuthConfig = {
      type: "jwks",
      jwksUrl: jwksUrl.trim(),
    };
    const issuer = trimOptional(env["JWT_ISSUER"]);
    const audience = trimOptional(env["JWT_AUDIENCE"]);
    if (issuer !== undefined) {
      config.issuer = issuer;
    }
    if (audience !== undefined) {
      config.audience = audience;
    }
    return config;
  }

  return null;
}

function trimOptional(
  value: string | undefined,
): string | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }
  return value.trim();
}
