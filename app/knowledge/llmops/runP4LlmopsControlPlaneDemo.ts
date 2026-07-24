/**
 * P4 LLMOps Control Plane demo (portfolio / local console).
 *
 * One InMemory story: Registry → Experiment Run → Gate → Regression →
 * Serving Config → Observation. Docker/network/keys not required.
 *
 *   pnpm demo:llmops:control-plane
 */
import { asEvaluationGateId } from "./EvaluationGateId";
import { asExperimentId } from "./ExperimentId";
import { asExperimentRunId } from "./ExperimentRunId";
import { asLlmopsObservationId } from "./LlmopsObservationId";
import { asModelId } from "./ModelId";
import { asModelVersionId } from "./ModelVersionId";
import { asPromptTemplateId } from "./PromptTemplateId";
import { asPromptVersionId } from "./PromptVersionId";
import { asServingConfigId } from "./ServingConfigId";
import { DefaultEvaluationGateEvaluator } from "./DefaultEvaluationGateEvaluator";
import { DefaultRegressionHarness } from "./DefaultRegressionHarness";
import { InMemoryExperimentRunStore } from "./InMemoryExperimentRunStore";
import { InMemoryLlmopsObservationStore } from "./InMemoryLlmopsObservationStore";
import { InMemoryModelRegistry } from "./InMemoryModelRegistry";
import { InMemoryPromptRegistry } from "./InMemoryPromptRegistry";
import { InMemoryServingConfigStore } from "./InMemoryServingConfigStore";

async function main(): Promise<void> {
  const workspaceId = "workspace-a";
  const now = 1_700_000_000_000;

  console.log("=== P4 LLMOps / Control Plane Demo ===");
  console.log("Why: version, gate, deploy-config, and observe AI systems");
  console.log(`Workspace: ${workspaceId}`);

  const prompts = new InMemoryPromptRegistry();
  const models = new InMemoryModelRegistry();
  const runs = new InMemoryExperimentRunStore();
  const serving = new InMemoryServingConfigStore();
  const observations = new InMemoryLlmopsObservationStore();
  const gate = new DefaultEvaluationGateEvaluator();
  const regression = new DefaultRegressionHarness();

  console.log("\n--- 1) Prompt & Model Registry ---");
  await prompts.registerTemplate({
    id: asPromptTemplateId("tpl-cited"),
    workspaceId,
    name: "cited-answer",
  });
  await prompts.registerVersion({
    id: asPromptVersionId("pv-1.0.0"),
    templateId: asPromptTemplateId("tpl-cited"),
    workspaceId,
    version: "1.0.0",
    body: "Answer using evidence only.\nQuestion: {{query}}",
  });
  await models.registerModel({
    id: asModelId("mdl-fake"),
    workspaceId,
    name: "fake-chat",
  });
  await models.registerVersion({
    id: asModelVersionId("mv-1.0.0"),
    modelId: asModelId("mdl-fake"),
    workspaceId,
    version: "1.0.0",
    providerModel: "fake-llm-v1",
  });
  console.log("promptVersion=pv-1.0.0  modelVersion=mv-1.0.0");

  console.log("\n--- 2) Experiment / Run Tracking ---");
  const runId = asExperimentRunId("run-demo-1");
  await runs.create({
    id: runId,
    experimentId: asExperimentId("exp-cited-v1"),
    workspaceId,
    status: "running",
    params: {
      promptVersionId: "pv-1.0.0",
      modelVersionId: "mv-1.0.0",
    },
    startedAtUnixMs: now,
  });
  const metrics = {
    hitRateAtK: 0.92,
    meanReciprocalRank: 0.81,
    latencyMs: 120,
  };
  const completed = await runs.updateStatus({
    workspaceId,
    runId,
    status: "completed",
    metrics,
    endedAtUnixMs: now + 500,
  });
  console.log(
    `run=${completed.id}  status=${completed.status}  metrics=${JSON.stringify(completed.metrics)}`,
  );

  console.log("\n--- 3) Evaluation Gate ---");
  const gateId = asEvaluationGateId("gate-prod-min");
  const gateResult = gate.evaluate({
    metrics: {
      hitRateAtK: metrics.hitRateAtK,
      meanReciprocalRank: metrics.meanReciprocalRank,
    },
    rules: [
      { metricKey: "hitRateAtK", comparator: "gte", threshold: 0.8 },
      { metricKey: "meanReciprocalRank", comparator: "gte", threshold: 0.7 },
    ],
  });
  console.log(`gate=${gateId}  passed=${gateResult.passed}`);
  for (const rule of gateResult.ruleResults) {
    console.log(
      `  ${rule.metricKey} ${rule.comparator} ${rule.threshold} → actual=${rule.actual} passed=${rule.passed}`,
    );
  }
  if (!gateResult.passed) {
    console.error("Demo expected gate to pass");
    process.exitCode = 1;
    return;
  }

  console.log("\n--- 4) Regression Harness ---");
  const harness = regression.compare({
    baseline: { hitRateAtK: 0.9, meanReciprocalRank: 0.78 },
    candidate: {
      hitRateAtK: metrics.hitRateAtK,
      meanReciprocalRank: metrics.meanReciprocalRank,
    },
    tolerances: { hitRateAtK: 0.02, meanReciprocalRank: 0.02 },
  });
  console.log(
    `regressionPassed=${harness.passed}  regressions=${harness.regressions.length}`,
  );
  if (!harness.passed) {
    console.error("Demo expected no regressions");
    process.exitCode = 1;
    return;
  }

  console.log("\n--- 5) Serving Configuration ---");
  const servingId = asServingConfigId("svc-dev-main");
  await serving.register({
    id: servingId,
    workspaceId,
    name: "dev-main",
    environment: "dev",
    promptVersionId: asPromptVersionId("pv-1.0.0"),
    modelVersionId: asModelVersionId("mv-1.0.0"),
    gateId,
    trafficPercent: 100,
  });
  const active = await serving.activate({
    workspaceId,
    id: servingId,
    activatedAtUnixMs: now + 1000,
  });
  console.log(
    `serving=${active.id}  status=${active.status}  env=${active.environment}  traffic=${active.trafficPercent}%`,
  );

  console.log("\n--- 6) LLMOps Observation ---");
  await observations.record({
    id: asLlmopsObservationId("obs-demo-1"),
    workspaceId,
    recordedAtUnixMs: now + 1500,
    experimentRunId: runId,
    servingConfigId: servingId,
    quality: {
      hitRateAtK: metrics.hitRateAtK,
      gatePass: gateResult.passed ? 1 : 0,
    },
    costUnits: 0.002,
    latencyMs: metrics.latencyMs,
    attributes: { softMap: "llmops.quality/cost/latency" },
  });
  const listed = await observations.listByWorkspace(workspaceId);
  console.log(
    `observations=${listed.length}  latest=${listed[0]?.id}  latencyMs=${listed[0]?.latencyMs}`,
  );

  console.log("\nControl plane story complete (InMemory / Fake-validated).");
  console.log(
    "Validators: pnpm validate:llmops:run-store / prompt-registry / model-registry / evaluation-gate / regression-harness / serving-config / observation-store",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
