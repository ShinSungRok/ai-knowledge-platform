/**
 * Shared env + factory for P2 Service Completion Phase A/B HTTP host.
 * InMemory composition + Fake LLM by default; optional HTTP LLM when
 * `LLM_API_KEY` is set. No Express / Postgres / OpenSearch.
 */

import { loadLlmHttpProviderConfig } from "../ai/loadLlmHttpProviderConfig";
import {
  createListeningOperationsServer,
  type ListeningOperationsServer,
} from "./createListeningOperationsServer";
import type { LlmProviderOption } from "./createLanguageModelProvider";

export type ListeningOperationsHostEnv = {
  host: string;
  port: number;
  apiKey: string;
  apiKeySubject: string;
  workspaceId: string;
  skipDemoSeed: boolean;
  /** `fake` when LLM_API_KEY unset; `http` when set. */
  llmMode: "fake" | "http";
  llm?: LlmProviderOption;
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

function resolveLlmOption(
  env: NodeJS.ProcessEnv,
): Pick<ListeningOperationsHostEnv, "llmMode" | "llm"> {
  const apiKey = env["LLM_API_KEY"];
  if (apiKey === undefined || apiKey.trim() === "") {
    return { llmMode: "fake" };
  }
  const timeoutRaw = env["LLM_TIMEOUT_MS"]?.trim();
  const timeoutMs =
    timeoutRaw !== undefined && timeoutRaw !== ""
      ? Number(timeoutRaw)
      : undefined;
  const raw: Record<string, unknown> = {
    baseUrl: getEnv(env, "LLM_BASE_URL", "https://api.openai.com/v1"),
    apiKey: apiKey.trim(),
    model: getEnv(env, "LLM_MODEL", "gpt-4o-mini"),
  };
  if (
    timeoutMs !== undefined &&
    Number.isInteger(timeoutMs) &&
    timeoutMs > 0
  ) {
    raw["timeoutMs"] = timeoutMs;
  }
  return {
    llmMode: "http",
    llm: {
      type: "http",
      config: loadLlmHttpProviderConfig(raw),
    },
  };
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
  const llm = resolveLlmOption(env);
  return {
    host: getEnv(env, "HOST", "127.0.0.1"),
    port,
    apiKey: getEnv(env, "API_KEY", "demo-key"),
    apiKeySubject: getEnv(env, "API_KEY_SUBJECT", "demo-user"),
    workspaceId: getEnv(env, "WORKSPACE_ID", "workspace-a"),
    skipDemoSeed: skip === "1" || skip.toLowerCase() === "true",
    ...llm,
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
    ...(hostEnv.llm !== undefined ? { llm: hostEnv.llm } : {}),
  });
}
