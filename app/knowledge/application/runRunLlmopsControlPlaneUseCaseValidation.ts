/**
 * Dependency-free validation for RunLlmopsControlPlaneUseCase labels + metrics.
 */
import { RunLlmopsControlPlaneUseCase } from "./RunLlmopsControlPlaneUseCase";
import { asExperimentRunId } from "../llmops/ExperimentRunId";
import { InMemoryEvaluationGateDefinitionStore } from "../llmops/InMemoryEvaluationGateDefinitionStore";
import { InMemoryExperimentRunStore } from "../llmops/InMemoryExperimentRunStore";
import { InMemoryLlmopsObservationStore } from "../llmops/InMemoryLlmopsObservationStore";
import { InMemoryModelRegistry } from "../llmops/InMemoryModelRegistry";
import { InMemoryPromptRegistry } from "../llmops/InMemoryPromptRegistry";
import { InMemoryServingConfigStore } from "../llmops/InMemoryServingConfigStore";
import { asServingConfigId } from "../llmops/ServingConfigId";

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  console.log("[application] control-plane default labels are fake...");
  const defaults = new RunLlmopsControlPlaneUseCase();
  const base = await defaults.execute({ workspaceId: "workspace-a" });
  assertEqual(base.modelName, "fake-chat", "default modelName");
  assertEqual(base.providerModel, "fake-llm-v1", "default providerModel");
  assertEqual(base.gatePassed, true, "default gate passes");
  assertEqual(base.metrics.latencyMs, 120, "default latency");

  console.log("[application] constructor defaults from LLM_MODEL-style labels...");
  const labeled = new RunLlmopsControlPlaneUseCase({
    modelName: "gemini-3.6-flash",
    providerModel: "gemini-3.6-flash",
  });
  const fromCtor = await labeled.execute({ workspaceId: "workspace-a" });
  assertEqual(fromCtor.modelName, "gemini-3.6-flash", "ctor modelName");
  assertEqual(
    fromCtor.providerModel,
    "gemini-3.6-flash",
    "ctor providerModel",
  );

  console.log("[application] per-request servingLabels + live latency override...");
  const overridden = await labeled.execute({
    workspaceId: "workspace-a",
    metrics: {
      latencyMs: 842,
      hitRateAtK: 0.92,
      meanReciprocalRank: 0.81,
      citationCount: 1,
    },
    servingLabels: {
      modelName: "override-model",
      providerModel: "override-provider",
    },
  });
  assertEqual(overridden.modelName, "override-model", "override modelName");
  assertEqual(
    overridden.providerModel,
    "override-provider",
    "override providerModel",
  );
  assertEqual(overridden.metrics.latencyMs, 842, "override latency");
  assertEqual(overridden.metrics.citationCount, 1, "citationCount");
  assertTruthy(overridden.observationId.length > 0, "observationId");
  assertEqual(overridden.servingStatus, "active", "serving active");

  console.log("[application] insufficient soft metrics can fail gate...");
  const failed = await defaults.execute({
    workspaceId: "workspace-a",
    metrics: {
      hitRateAtK: 0.55,
      meanReciprocalRank: 0.4,
      latencyMs: 900,
    },
  });
  assertEqual(failed.gatePassed, false, "soft fail gate");
  assertEqual(failed.regressionPassed, false, "soft fail regression too");
  assertEqual(failed.runStatus, "failed", "run status reflects failed outcome");

  console.log("[application] failing metrics persist a real 'failed' experiment run status...");
  const runsStore = new InMemoryExperimentRunStore();
  const withRunStore = new RunLlmopsControlPlaneUseCase({}, { runs: runsStore });
  const failedPersisted = await withRunStore.execute({
    workspaceId: "workspace-a",
    metrics: { hitRateAtK: 0.5, meanReciprocalRank: 0.3, latencyMs: 900 },
  });
  const persistedRun = await runsStore.getById(
    "workspace-a",
    asExperimentRunId(failedPersisted.experimentRunId),
  );
  assertEqual(persistedRun?.status, "failed", "persisted run status failed");
  assertTruthy(
    typeof persistedRun?.error === "string" && persistedRun.error.length > 0,
    "persisted run has an error message",
  );

  console.log("[application] environment + trafficPercent are request-driven...");
  const servingStore = new InMemoryServingConfigStore();
  const withServingStore = new RunLlmopsControlPlaneUseCase(
    {},
    { serving: servingStore },
  );
  const stagingResult = await withServingStore.execute({
    workspaceId: "workspace-a",
    environment: "staging",
    trafficPercent: 42,
  });
  assertEqual(stagingResult.environment, "staging", "result reflects environment");
  const stagingConfig = await servingStore.getById(
    "workspace-a",
    asServingConfigId(stagingResult.servingConfigId),
  );
  assertEqual(stagingConfig?.environment, "staging", "persisted environment");
  assertEqual(stagingConfig?.trafficPercent, 42, "persisted trafficPercent");
  assertEqual(stagingConfig?.name, "staging-main", "name derives from environment");

  console.log("[application] custom gateRules reach eq/lte comparators live...");
  const gateStore = new InMemoryEvaluationGateDefinitionStore();
  const withGateStore = new RunLlmopsControlPlaneUseCase(
    {},
    { gateDefinitions: gateStore },
  );
  const customGateResult = await withGateStore.execute({
    workspaceId: "workspace-a",
    metrics: { hitRateAtK: 0.92, meanReciprocalRank: 0.81, citationCount: 1 },
    gateRules: [{ metricKey: "citationCount", comparator: "eq", threshold: 1 }],
  });
  assertEqual(customGateResult.gatePassed, true, "eq rule passes on match");
  assertTruthy(
    customGateResult.gateDefinitionId !== "gate-def-default",
    "custom gateRules register a fresh definition, not the shared default",
  );

  console.log("[application] default gate definition is registered once and reused...");
  const gateStore2 = new InMemoryEvaluationGateDefinitionStore();
  const withGateStore2 = new RunLlmopsControlPlaneUseCase(
    {},
    { gateDefinitions: gateStore2 },
  );
  const first = await withGateStore2.execute({ workspaceId: "workspace-a" });
  const second = await withGateStore2.execute({ workspaceId: "workspace-a" });
  assertEqual(first.gateDefinitionId, "gate-def-default", "first uses default id");
  assertEqual(second.gateDefinitionId, "gate-def-default", "second reuses default id");
  const gateDefs = await gateStore2.listByWorkspace("workspace-a");
  assertEqual(gateDefs.length, 1, "default gate definition registered exactly once");

  console.log("[application] persistent stores accumulate history across execute() calls...");
  const prompts = new InMemoryPromptRegistry();
  const models = new InMemoryModelRegistry();
  const serving = new InMemoryServingConfigStore();
  const observations = new InMemoryLlmopsObservationStore();
  const withAllStores = new RunLlmopsControlPlaneUseCase(
    {},
    { prompts, models, serving, observations },
  );
  await withAllStores.execute({ workspaceId: "workspace-a" });
  await withAllStores.execute({ workspaceId: "workspace-a" });
  assertEqual(
    (await prompts.listTemplates("workspace-a")).length,
    2,
    "two prompt templates accumulated",
  );
  assertEqual(
    (await models.listModels("workspace-a")).length,
    2,
    "two models accumulated",
  );
  assertEqual(
    (await serving.listByWorkspace("workspace-a")).length,
    2,
    "two serving configs accumulated",
  );
  assertEqual(
    (await observations.listByWorkspace("workspace-a")).length,
    2,
    "two observations accumulated",
  );

  console.log("RunLlmopsControlPlaneUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
