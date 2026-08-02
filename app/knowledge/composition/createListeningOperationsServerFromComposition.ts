import { createKnowledgeHttpRouter } from "../api/createKnowledgeHttpRouter";
import type { RunLlmopsControlPlaneUseCase } from "../application/RunLlmopsControlPlaneUseCase";
import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
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
import type { WorkflowAgentRegistry } from "../workflow/WorkflowAgentRegistry";
import type { WorkflowMemoryStore } from "../workflow/WorkflowMemoryStore";
import type { WorkflowOrchestrator } from "../workflow/WorkflowOrchestrator";
import type { WorkflowRunStore } from "../workflow/WorkflowRunStore";
import type { EvaluationGateDefinitionStore } from "../llmops/EvaluationGateDefinitionStore";
import type { ExperimentRunStore } from "../llmops/ExperimentRunStore";
import type { LlmopsObservationStore } from "../llmops/LlmopsObservationStore";
import type { ModelRegistry } from "../llmops/ModelRegistry";
import type { PromptRegistry } from "../llmops/PromptRegistry";
import type { ServingConfigStore } from "../llmops/ServingConfigStore";
import {
  createAuthenticatorFromOption,
  type AuthProviderOption,
} from "./createAuthenticator";
import { createHostLlmopsControlPlane } from "./createHostLlmopsControlPlane";
import { createHostWorkflowOrchestrator } from "./createHostWorkflowOrchestrator";
import { createOperationsObservability } from "./createOperationsObservability";
import type { KnowledgeRuntime } from "./KnowledgeRuntime";

export type ListeningCompositionSurface = {
  runtime: KnowledgeRuntime;
  mcpJsonRpcHandler: McpJsonRpcHandler;
  /** Present on host compositions; used when workflowAgentLlm is on. */
  languageModelProvider?: LanguageModelProvider;
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
  /**
   * When true and composition exposes languageModelProvider, synthesizer
   * and critic steps use LanguageModelWorkflowAgentInvoker.
   */
  workflowAgentLlm?: boolean;
  /** Inject orchestrator (tests). When omitted, host factory builds one. */
  workflowOrchestrator?: WorkflowOrchestrator;
  /**
   * Inject the run store backing GET .../workflow-runs/:id (tests). When
   * `workflowOrchestrator` is omitted, defaults to the host factory's own
   * store; when `workflowOrchestrator` is injected, the GET-by-id route
   * only activates if this is also supplied.
   */
  workflowRunStore?: WorkflowRunStore;
  /**
   * Inject the memory store backing GET .../workflow-runs/:id/memory
   * (tests). Same defaulting rule as `workflowRunStore`.
   */
  workflowMemoryStore?: WorkflowMemoryStore;
  /**
   * Inject the agent registry backing GET .../workflow-agents (tests).
   * Same defaulting rule as `workflowRunStore`.
   */
  workflowAgentRegistry?: WorkflowAgentRegistry;
  /** Inject llmops use case (tests). When omitted, host factory builds one. */
  runLlmopsControlPlane?: RunLlmopsControlPlaneUseCase;
  /**
   * Inject the store backing GET .../llmops/experiment-runs/:id (tests).
   * When `runLlmopsControlPlane` is omitted, defaults to the host
   * factory's own store; when `runLlmopsControlPlane` is injected, the
   * route only activates if this is also supplied.
   */
  llmopsExperimentRunStore?: ExperimentRunStore;
  /** Inject the registry backing GET .../llmops/prompts. Same defaulting rule. */
  llmopsPromptRegistry?: PromptRegistry;
  /** Inject the registry backing GET .../llmops/models. Same defaulting rule. */
  llmopsModelRegistry?: ModelRegistry;
  /** Inject the store backing GET .../llmops/evaluation-gates. Same defaulting rule. */
  llmopsGateDefinitionStore?: EvaluationGateDefinitionStore;
  /** Inject the store backing GET .../llmops/serving-configs. Same defaulting rule. */
  llmopsServingConfigStore?: ServingConfigStore;
  /** Inject the store backing GET .../llmops/observations. Same defaulting rule. */
  llmopsObservationStore?: LlmopsObservationStore;
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
 * Always registers workflow-runs and llmops/control-plane (InMemory).
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
  const useAgentLlm =
    options.workflowAgentLlm === true &&
    options.composition.languageModelProvider !== undefined;
  const hostWorkflow =
    options.workflowOrchestrator === undefined
      ? createHostWorkflowOrchestrator({
          p2Bridge: options.workflowP2Bridge === true,
          runtime: options.composition.runtime,
          ...(useAgentLlm
            ? {
                languageModelProvider:
                  options.composition.languageModelProvider,
              }
            : {}),
        })
      : undefined;
  const workflowOrchestrator =
    options.workflowOrchestrator ?? hostWorkflow!.orchestrator;
  const workflowRunStore = options.workflowRunStore ?? hostWorkflow?.runStore;
  const workflowMemoryStore =
    options.workflowMemoryStore ?? hostWorkflow?.memory;
  const workflowAgentRegistry =
    options.workflowAgentRegistry ?? hostWorkflow?.registry;
  const hostLlmops =
    options.runLlmopsControlPlane === undefined
      ? createHostLlmopsControlPlane()
      : undefined;
  const runLlmopsControlPlane =
    options.runLlmopsControlPlane ?? hostLlmops!.runControlPlane;
  const llmopsExperimentRunStore =
    options.llmopsExperimentRunStore ?? hostLlmops?.runs;
  const llmopsPromptRegistry =
    options.llmopsPromptRegistry ?? hostLlmops?.prompts;
  const llmopsModelRegistry =
    options.llmopsModelRegistry ?? hostLlmops?.models;
  const llmopsGateDefinitionStore =
    options.llmopsGateDefinitionStore ?? hostLlmops?.gateDefinitions;
  const llmopsServingConfigStore =
    options.llmopsServingConfigStore ?? hostLlmops?.serving;
  const llmopsObservationStore =
    options.llmopsObservationStore ?? hostLlmops?.observations;
  const innerRouter = createKnowledgeHttpRouter(
    options.composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    options.composition.mcpJsonRpcHandler,
    {
      workflowOrchestrator,
      workflowRunStore,
      workflowMemoryStore,
      workflowAgentRegistry,
      runLlmopsControlPlane,
      llmopsExperimentRunStore,
      llmopsPromptRegistry,
      llmopsModelRegistry,
      llmopsGateDefinitionStore,
      llmopsServingConfigStore,
      llmopsObservationStore,
    },
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
