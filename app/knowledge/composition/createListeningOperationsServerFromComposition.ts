import { createKnowledgeHttpRouter } from "../api/createKnowledgeHttpRouter";
import { ObservingHttpRouter } from "../http/ObservingHttpRouter";
import type { McpJsonRpcHandler } from "../mcp/McpJsonRpcHandler";
import type { InMemoryLogger } from "../observability/InMemoryLogger";
import type { InMemoryMetrics } from "../observability/InMemoryMetrics";
import type { HttpListenAddress } from "../server/HttpListenAddress";
import type { HttpListenConfig } from "../server/HttpListenConfig";
import type { HttpListener } from "../server/HttpListener";
import { NodeHttpListener } from "../server/NodeHttpListener";
import type { ApiKeyPrincipalEntry } from "../security/ApiKeyAuthenticator";
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkflowOrchestrator } from "../workflow/WorkflowOrchestrator";
import {
  createAuthenticatorFromOption,
  type AuthProviderOption,
} from "./createAuthenticator";
import { createHostWorkflowOrchestrator } from "./createHostWorkflowOrchestrator";
import { createOperationsObservability } from "./createOperationsObservability";
import type { KnowledgeRuntime } from "./KnowledgeRuntime";

export type ListeningCompositionSurface = {
  runtime: KnowledgeRuntime;
  mcpJsonRpcHandler: McpJsonRpcHandler;
};

export type CreateListeningFromCompositionOptions = {
  composition: ListeningCompositionSurface;
  listen?: HttpListenConfig;
  auth?: AuthProviderOption;
  apiKeys?: Readonly<Record<string, ApiKeyPrincipalEntry>>;
  /**
   * When true, researcher steps use P2 cited-answer via runtime.
   * Default false (Fake invoker). Host sets true when demo seed runs.
   */
  workflowP2Bridge?: boolean;
  /** Inject orchestrator (tests). When omitted, host factory builds one. */
  workflowOrchestrator?: WorkflowOrchestrator;
};

export type ListeningOperationsServerBase = {
  listener: HttpListener;
  logger: InMemoryLogger;
  metrics: InMemoryMetrics;
  flushObservability?: () => Promise<void>;
  start(): Promise<HttpListenAddress>;
  stop(): Promise<void>;
};

const DEFAULT_LISTEN: HttpListenConfig = {
  host: "127.0.0.1",
  port: 0,
};

function resolveAuthenticator(
  options: CreateListeningFromCompositionOptions,
) {
  if (options.auth !== undefined) {
    return createAuthenticatorFromOption(options.auth);
  }
  if (options.apiKeys !== undefined) {
    return createAuthenticatorFromOption({
      type: "apiKey",
      apiKeys: options.apiKeys,
    });
  }
  throw new Error(
    "createListeningOperationsServerFromComposition requires apiKeys or auth",
  );
}

/**
 * Wires ObservingHttpRouter + NodeHttpListener around an existing
 * composition that already exposes runtime + mcpJsonRpcHandler.
 * Always registers thin POST .../workflow-runs (Fake or optional P2 bridge).
 */
export function createListeningOperationsServerFromComposition(
  options: CreateListeningFromCompositionOptions,
): ListeningOperationsServerBase & {
  composition: ListeningCompositionSurface;
} {
  const listenConfig = options.listen ?? DEFAULT_LISTEN;
  const observability = createOperationsObservability();
  const authenticator = resolveAuthenticator(options);
  const bearerGuard = new HttpBearerGuard(authenticator);
  const workspaceAuthorizer = new DefaultWorkspaceAuthorizer();
  const workflowOrchestrator =
    options.workflowOrchestrator ??
    createHostWorkflowOrchestrator({
      p2Bridge: options.workflowP2Bridge === true,
      runtime: options.composition.runtime,
    });
  const innerRouter = createKnowledgeHttpRouter(
    options.composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    options.composition.mcpJsonRpcHandler,
    { workflowOrchestrator },
  );
  const router = new ObservingHttpRouter(
    innerRouter,
    observability.routerLogger,
    observability.routerMetrics,
    observability.tracer,
  );
  const listener = new NodeHttpListener(router);

  return {
    listener,
    composition: options.composition,
    logger: observability.logger,
    metrics: observability.metrics,
    ...(observability.flushObservability
      ? { flushObservability: observability.flushObservability }
      : {}),
    start: () => listener.listen(listenConfig),
    stop: () => listener.close(),
  };
}
