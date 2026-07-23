/**
 * Shared env + factory for P2 Service Completion Phase A/B HTTP host.
 * InMemory by default; optional Postgres when DATABASE_URL is set.
 * Fake LLM by default; optional HTTP LLM when LLM_API_KEY is set.
 * No Express / OpenSearch.
 */

import { loadLlmHttpProviderConfig } from "../ai/loadLlmHttpProviderConfig";
import type { PostgresPool } from "../infra/PostgresPool";
import {
  createListeningOperationsServer,
  type ListeningOperationsServer,
} from "./createListeningOperationsServer";
import {
  createListeningOperationsServerFromComposition,
  type ListeningOperationsServerBase,
} from "./createListeningOperationsServerFromComposition";
import type { LlmProviderOption } from "./createLanguageModelProvider";
import { createPostgresKnowledgeComposition } from "./createPostgresKnowledgeComposition";
import type { SqlKnowledgeComposition } from "./SqlKnowledgeComposition";

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
  /** Unset → InMemory; set → Postgres SoT. */
  databaseUrl?: string;
  storeMode: "inmemory" | "postgres";
};

export type ListeningHostHandle = {
  storeMode: "inmemory" | "postgres";
  llmMode: "fake" | "http";
  workspaceId: string;
  skipDemoSeed: boolean;
  server: ListeningOperationsServerBase & {
    composition: ListeningOperationsServer["composition"] | SqlKnowledgeComposition;
  };
  dispose(): Promise<void>;
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
  const databaseUrlRaw = env["DATABASE_URL"]?.trim();
  const databaseUrl =
    databaseUrlRaw !== undefined && databaseUrlRaw.length > 0
      ? databaseUrlRaw
      : undefined;
  return {
    host: getEnv(env, "HOST", "127.0.0.1"),
    port,
    apiKey: getEnv(env, "API_KEY", "demo-key"),
    apiKeySubject: getEnv(env, "API_KEY_SUBJECT", "demo-user"),
    workspaceId: getEnv(env, "WORKSPACE_ID", "workspace-a"),
    skipDemoSeed: skip === "1" || skip.toLowerCase() === "true",
    databaseUrl,
    storeMode: databaseUrl !== undefined ? "postgres" : "inmemory",
    ...llm,
  };
}

/** InMemory path only (used by start-smoke). */
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

type PostgresPoolWithEnd = PostgresPool & {
  end?: () => Promise<void>;
};

async function createPostgresPool(
  databaseUrl: string,
): Promise<PostgresPoolWithEnd> {
  const { Pool } = await import("pg");
  return new Pool({ connectionString: databaseUrl }) as PostgresPoolWithEnd;
}

/**
 * Creates the Phase A/B listening host: InMemory by default, Postgres when
 * `DATABASE_URL` is set. Caller must `dispose()` after stop.
 */
export async function createConfiguredListeningHost(
  hostEnv: ListeningOperationsHostEnv = loadListeningOperationsHostEnv(),
): Promise<ListeningHostHandle> {
  const apiKeys = {
    [hostEnv.apiKey]: {
      subject: hostEnv.apiKeySubject,
      workspaceId: hostEnv.workspaceId,
    },
  } as const;
  const listen = { host: hostEnv.host, port: hostEnv.port };

  if (hostEnv.storeMode === "inmemory" || hostEnv.databaseUrl === undefined) {
    const server = createListeningOperationsServer({
      listen,
      apiKeys,
      ...(hostEnv.llm !== undefined ? { llm: hostEnv.llm } : {}),
    });
    return {
      storeMode: "inmemory",
      llmMode: hostEnv.llmMode,
      workspaceId: hostEnv.workspaceId,
      skipDemoSeed: hostEnv.skipDemoSeed,
      server,
      dispose: async () => {
        /* no pool */
      },
    };
  }

  const pool = await createPostgresPool(hostEnv.databaseUrl);
  const composition = await createPostgresKnowledgeComposition({
    pool,
    applySchema: true,
    ...(hostEnv.llm !== undefined ? { llm: hostEnv.llm } : {}),
  });
  const server = createListeningOperationsServerFromComposition({
    composition,
    listen,
    apiKeys,
  });
  return {
    storeMode: "postgres",
    llmMode: hostEnv.llmMode,
    workspaceId: hostEnv.workspaceId,
    skipDemoSeed: hostEnv.skipDemoSeed,
    server: {
      ...server,
      composition,
    },
    dispose: async () => {
      if (typeof pool.end === "function") {
        await pool.end();
      }
    },
  };
}
