import {
  createOperationsKnowledgeServer,
  type CreateOperationsKnowledgeServerOptions,
} from "./createOperationsKnowledgeServer";
import { loadJwtAuthConfig } from "../security/loadJwtAuthConfig";

export type CreateOperationsKnowledgeServerFromEnvOptions = Omit<
  CreateOperationsKnowledgeServerOptions,
  "auth" | "apiKeys"
> & {
  apiKeys?: CreateOperationsKnowledgeServerOptions["apiKeys"];
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
};

/**
 * Operations server factory that enables JWT AuthN only when JWT env is set.
 * When `JWT_SECRET` or `JWT_JWKS_URL` is configured, uses JWT; otherwise
 * requires `apiKeys` (same as explicit `createOperationsKnowledgeServer`).
 */
export function createOperationsKnowledgeServerFromEnv(
  options: CreateOperationsKnowledgeServerFromEnvOptions = {},
) {
  const env = options.env ?? process.env;
  const jwtConfig = loadJwtAuthConfig(env);
  if (jwtConfig !== null) {
    const { apiKeys: _ignored, env: _env, ...rest } = options;
    return createOperationsKnowledgeServer({
      ...rest,
      auth: { type: "jwt", config: jwtConfig },
    });
  }
  if (options.apiKeys === undefined) {
    throw new Error(
      "createOperationsKnowledgeServerFromEnv requires apiKeys when JWT env is unset",
    );
  }
  const { env: _env, ...rest } = options;
  return createOperationsKnowledgeServer({
    ...rest,
    apiKeys: options.apiKeys,
  });
}
