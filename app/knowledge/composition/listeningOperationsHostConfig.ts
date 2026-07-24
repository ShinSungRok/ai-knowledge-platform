/**
 * Shared env + factory for P2 Service Completion Phase A/B HTTP host.
 *
 * Selection rules:
 * 1. OPENSEARCH_URL unset → InMemory (no DATABASE_URL) or Postgres SoT + SqlVectorIndex
 * 2. OPENSEARCH_URL set, DATABASE_URL unset → InMemorySql SoT + OpenSearch VectorIndex
 * 3. Both set → Postgres SoT + OpenSearch VectorIndex
 *
 * Fake LLM by default; optional HTTP LLM when LLM_API_KEY is set.
 * No Express; no official OpenSearch JS SDK.
 */

import { loadLlmHttpProviderConfig } from "../ai/loadLlmHttpProviderConfig";
import { FetchOpenSearchHttpTransport } from "../embedding/FetchOpenSearchHttpTransport";
import { loadOpenSearchClientConfig } from "../embedding/loadOpenSearchClientConfig";
import type { OpenSearchClientConfig } from "../embedding/OpenSearchClientConfig";
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
import { createOpenSearchKnowledgeComposition } from "./createOpenSearchKnowledgeComposition";
import { createPostgresKnowledgeComposition } from "./createPostgresKnowledgeComposition";
import {
  resolveWorkflowP2Bridge,
} from "./createHostWorkflowOrchestrator";
import type { SqlKnowledgeComposition } from "./SqlKnowledgeComposition";

/** Document/source store + vector combination label for logs. */
export type HostStoreMode =
  | "inmemory"
  | "postgres"
  | "opensearch"
  | "postgres+opensearch";

/** Vector index backend for logs. */
export type HostVectorMode = "inmemory" | "sql" | "opensearch";

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
  /** Unset → no Postgres pool. */
  databaseUrl?: string;
  /** Present when OPENSEARCH_URL is set. */
  openSearchConfig?: OpenSearchClientConfig;
  storeMode: HostStoreMode;
  vectorMode: HostVectorMode;
  /**
   * Researcher P2 cited-answer bridge. Default: on when demo seed runs;
   * override with WORKFLOW_P2_BRIDGE=0|1.
   */
  workflowP2Bridge: boolean;
};

export type ListeningHostHandle = {
  storeMode: HostStoreMode;
  vectorMode: HostVectorMode;
  llmMode: "fake" | "http";
  workflowP2Bridge: boolean;
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

function resolveStoreAndVector(
  databaseUrl: string | undefined,
  openSearchConfig: OpenSearchClientConfig | null,
): Pick<ListeningOperationsHostEnv, "storeMode" | "vectorMode"> {
  const hasDb = databaseUrl !== undefined;
  const hasOs = openSearchConfig !== null;
  if (!hasOs && !hasDb) {
    return { storeMode: "inmemory", vectorMode: "inmemory" };
  }
  if (!hasOs && hasDb) {
    return { storeMode: "postgres", vectorMode: "sql" };
  }
  if (hasOs && !hasDb) {
    return { storeMode: "opensearch", vectorMode: "opensearch" };
  }
  return { storeMode: "postgres+opensearch", vectorMode: "opensearch" };
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
  const openSearchConfig = loadOpenSearchClientConfig(env);
  const modes = resolveStoreAndVector(databaseUrl, openSearchConfig);
  const skipDemoSeed = skip === "1" || skip.toLowerCase() === "true";
  return {
    host: getEnv(env, "HOST", "127.0.0.1"),
    port,
    apiKey: getEnv(env, "API_KEY", "demo-key"),
    apiKeySubject: getEnv(env, "API_KEY_SUBJECT", "demo-user"),
    workspaceId: getEnv(env, "WORKSPACE_ID", "workspace-a"),
    skipDemoSeed,
    databaseUrl,
    ...(openSearchConfig !== null ? { openSearchConfig } : {}),
    ...modes,
    workflowP2Bridge: resolveWorkflowP2Bridge(env, skipDemoSeed),
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
    workflowP2Bridge: hostEnv.workflowP2Bridge,
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
 * Creates the Phase A/B listening host per store/vector selection rules.
 * Caller must `dispose()` after stop (ends Postgres pool when used).
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
  const llmOpt =
    hostEnv.llm !== undefined ? { llm: hostEnv.llm } : {};

  const baseHandle = {
    storeMode: hostEnv.storeMode,
    vectorMode: hostEnv.vectorMode,
    llmMode: hostEnv.llmMode,
    workflowP2Bridge: hostEnv.workflowP2Bridge,
    workspaceId: hostEnv.workspaceId,
    skipDemoSeed: hostEnv.skipDemoSeed,
  };

  const workflowOpt = { workflowP2Bridge: hostEnv.workflowP2Bridge };

  // Path 1: no OpenSearch — InMemory or Postgres+SqlVectorIndex
  if (hostEnv.openSearchConfig === undefined) {
    if (
      hostEnv.storeMode === "inmemory" ||
      hostEnv.databaseUrl === undefined
    ) {
      const server = createListeningOperationsServer({
        listen,
        apiKeys,
        ...llmOpt,
        ...workflowOpt,
      });
      return {
        ...baseHandle,
        storeMode: "inmemory",
        vectorMode: "inmemory",
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
      ...llmOpt,
    });
    const server = createListeningOperationsServerFromComposition({
      composition,
      listen,
      apiKeys,
      ...workflowOpt,
    });
    return {
      ...baseHandle,
      storeMode: "postgres",
      vectorMode: "sql",
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

  // Path 2/3: OpenSearch VectorIndex (Fetch transport)
  const openSearch = {
    config: hostEnv.openSearchConfig,
    transport: new FetchOpenSearchHttpTransport(
      hostEnv.openSearchConfig.baseUrl,
    ),
  };

  if (hostEnv.databaseUrl === undefined) {
    const composition = await createOpenSearchKnowledgeComposition(
      undefined,
      {
        openSearch,
        ...llmOpt,
      },
    );
    const server = createListeningOperationsServerFromComposition({
      composition,
      listen,
      apiKeys,
      ...workflowOpt,
    });
    return {
      ...baseHandle,
      storeMode: "opensearch",
      vectorMode: "opensearch",
      server: {
        ...server,
        composition,
      },
      dispose: async () => {
        /* no pool */
      },
    };
  }

  const pool = await createPostgresPool(hostEnv.databaseUrl);
  const composition = await createOpenSearchKnowledgeComposition(undefined, {
    pool,
    applySchema: true,
    openSearch,
    ...llmOpt,
  });
  const server = createListeningOperationsServerFromComposition({
    composition,
    listen,
    apiKeys,
    ...workflowOpt,
  });
  return {
    ...baseHandle,
    storeMode: "postgres+opensearch",
    vectorMode: "opensearch",
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
