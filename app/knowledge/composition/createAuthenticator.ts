import type { Authenticator } from "../security/Authenticator";
import type { ApiKeyPrincipalEntry } from "../security/ApiKeyAuthenticator";
import { ApiKeyAuthenticator } from "../security/ApiKeyAuthenticator";
import { FetchJwksHttpTransport } from "../security/FetchJwksHttpTransport";
import { Hs256JwtAuthenticator } from "../security/Hs256JwtAuthenticator";
import { Hs256JwtVerifier } from "../security/Hs256JwtVerifier";
import type { JwtAuthConfig } from "../security/JwtAuthConfig";
import type { JwksHttpTransport } from "../security/JwksHttpTransport";
import { loadJwtAuthConfig } from "../security/loadJwtAuthConfig";
import { Rs256JwtAuthenticator } from "../security/Rs256JwtAuthenticator";
import { Rs256JwtVerifier } from "../security/Rs256JwtVerifier";

/**
 * Optional AuthN provider selection for composition roots.
 * Default operations/listening paths remain API Key unless `auth` is set.
 */
export type AuthProviderOption =
  | {
      type: "apiKey";
      apiKeys: Readonly<Record<string, ApiKeyPrincipalEntry>>;
    }
  | {
      type: "jwt";
      config: JwtAuthConfig;
      jwksTransport?: JwksHttpTransport;
    };

export function createAuthenticatorFromOption(
  option: AuthProviderOption,
): Authenticator {
  if (option.type === "apiKey") {
    return new ApiKeyAuthenticator(option.apiKeys);
  }
  if (option.config.type === "hs256") {
    return new Hs256JwtAuthenticator(new Hs256JwtVerifier(option.config));
  }
  const transport =
    option.jwksTransport ?? new FetchJwksHttpTransport();
  return new Rs256JwtAuthenticator(
    new Rs256JwtVerifier(option.config, transport),
  );
}

/**
 * Resolves AuthN from explicit option, API keys, or optional env JWT when
 * `preferJwt` is true. Default `preferJwt` is false — env JWT alone does not
 * override ApiKey unless opted in.
 */
export function createAuthenticatorFromEnv(options: {
  apiKeys?: Readonly<Record<string, ApiKeyPrincipalEntry>>;
  preferJwt?: boolean;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  jwksTransport?: JwksHttpTransport;
}): Authenticator {
  const env = options.env ?? process.env;
  if (options.preferJwt === true) {
    const jwtConfig = loadJwtAuthConfig(env);
    if (jwtConfig !== null) {
      return createAuthenticatorFromOption({
        type: "jwt",
        config: jwtConfig,
        ...(options.jwksTransport
          ? { jwksTransport: options.jwksTransport }
          : {}),
      });
    }
  }
  if (options.apiKeys !== undefined) {
    return new ApiKeyAuthenticator(options.apiKeys);
  }
  throw new Error(
    "createAuthenticatorFromEnv requires apiKeys when JWT is not preferred or unset",
  );
}
