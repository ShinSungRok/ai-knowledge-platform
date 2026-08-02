/**
 * Host-side thin LLMOps control-plane wiring for `pnpm start`.
 * InMemory adapters only; no SQL / live OTLP / Express.
 * When `LLM_MODEL` is set, registry labels use that id (soft-link only).
 */
import type { EvaluationGateDefinitionStore } from "../llmops/EvaluationGateDefinitionStore";
import type { ExperimentRunStore } from "../llmops/ExperimentRunStore";
import { InMemoryEvaluationGateDefinitionStore } from "../llmops/InMemoryEvaluationGateDefinitionStore";
import { InMemoryExperimentRunStore } from "../llmops/InMemoryExperimentRunStore";
import { InMemoryLlmopsObservationStore } from "../llmops/InMemoryLlmopsObservationStore";
import { InMemoryModelRegistry } from "../llmops/InMemoryModelRegistry";
import { InMemoryPromptRegistry } from "../llmops/InMemoryPromptRegistry";
import { InMemoryServingConfigStore } from "../llmops/InMemoryServingConfigStore";
import type { LlmopsObservationStore } from "../llmops/LlmopsObservationStore";
import type { ModelRegistry } from "../llmops/ModelRegistry";
import type { PromptRegistry } from "../llmops/PromptRegistry";
import type { ServingConfigStore } from "../llmops/ServingConfigStore";
import { RunLlmopsControlPlaneUseCase } from "../application/RunLlmopsControlPlaneUseCase";

/**
 * Result of {@link createHostLlmopsControlPlane}: the use case plus the
 * persistent stores it was built with, so callers (the listening host) can
 * thread read access into HTTP controllers without the use case itself
 * exposing them.
 */
export type HostLlmopsControlPlane = {
  runControlPlane: RunLlmopsControlPlaneUseCase;
  prompts: PromptRegistry;
  models: ModelRegistry;
  runs: ExperimentRunStore;
  serving: ServingConfigStore;
  observations: LlmopsObservationStore;
  gateDefinitions: EvaluationGateDefinitionStore;
};

/**
 * Builds {@link RunLlmopsControlPlaneUseCase} for listening HTTP, backed by
 * stores that persist for the life of the host process — repeated
 * `execute()` calls accumulate real history instead of each starting a
 * fresh, throwaway InMemory control-plane story.
 */
export function createHostLlmopsControlPlane(
  env: NodeJS.ProcessEnv = process.env,
): HostLlmopsControlPlane {
  const prompts = new InMemoryPromptRegistry();
  const models = new InMemoryModelRegistry();
  const runs = new InMemoryExperimentRunStore();
  const serving = new InMemoryServingConfigStore();
  const observations = new InMemoryLlmopsObservationStore();
  const gateDefinitions = new InMemoryEvaluationGateDefinitionStore();
  const stores = { prompts, models, runs, serving, observations, gateDefinitions };

  const model = env["LLM_MODEL"]?.trim();
  const runControlPlane =
    model === undefined || model.length === 0
      ? new RunLlmopsControlPlaneUseCase({}, stores)
      : new RunLlmopsControlPlaneUseCase(
          { modelName: model, providerModel: model },
          stores,
        );

  return {
    runControlPlane,
    prompts,
    models,
    runs,
    serving,
    observations,
    gateDefinitions,
  };
}
