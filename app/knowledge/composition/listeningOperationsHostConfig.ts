/**
 * Shared env + factory for P2 Service Completion Phase A HTTP host.
 * InMemory composition + Fake LLM (default). No Express / Postgres / OpenSearch.
 */

import {
  createListeningOperationsServer,
  type ListeningOperationsServer,
} from "./createListeningOperationsServer";

export type ListeningOperationsHostEnv = {
  host: string;
  port: number;
  apiKey: string;
  apiKeySubject: string;
  workspaceId: string;
  skipDemoSeed: boolean;
};

function getEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: string,
): string {
  const value = env[name];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return value.trim();
}

export function loadListeningOperationsHostEnv(
  env: NodeJS.ProcessEnv = process.env,
): ListeningOperationsHostEnv {
  const portRaw = getEnv(env, "PORT", "8080");
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be an integer 0–65535 (got ${portRaw})`);
  }
  const skip = getEnv(env, "SKIP_DEMO_SEED", "0");
  return {
    host: getEnv(env, "HOST", "127.0.0.1"),
    port,
    apiKey: getEnv(env, "API_KEY", "demo-key"),
    apiKeySubject: getEnv(env, "API_KEY_SUBJECT", "demo-user"),
    workspaceId: getEnv(env, "WORKSPACE_ID", "workspace-a"),
    skipDemoSeed: skip === "1" || skip.toLowerCase() === "true",
  };
}

export function createConfiguredListeningOperationsServer(
  hostEnv: ListeningOperationsHostEnv = loadListeningOperationsHostEnv(),
): ListeningOperationsServer {
  return createListeningOperationsServer({
    listen: { host: hostEnv.host, port: hostEnv.port },
    apiKeys: {
      [hostEnv.apiKey]: {
        subject: hostEnv.apiKeySubject,
        workspaceId: hostEnv.workspaceId,
      },
    },
    // Fake LLM is the createListeningOperationsServer default.
  });
}
