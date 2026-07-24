import { randomUUID } from "node:crypto";
import { asEvaluationGateId } from "../llmops/EvaluationGateId";
import { asExperimentId } from "../llmops/ExperimentId";
import { asExperimentRunId } from "../llmops/ExperimentRunId";
import { asLlmopsObservationId } from "../llmops/LlmopsObservationId";
import { asModelId } from "../llmops/ModelId";
import { asModelVersionId } from "../llmops/ModelVersionId";
import { asPromptTemplateId } from "../llmops/PromptTemplateId";
import { asPromptVersionId } from "../llmops/PromptVersionId";
import { asServingConfigId } from "../llmops/ServingConfigId";
import { DefaultEvaluationGateEvaluator } from "../llmops/DefaultEvaluationGateEvaluator";
import { DefaultRegressionHarness } from "../llmops/DefaultRegressionHarness";
import { InMemoryExperimentRunStore } from "../llmops/InMemoryExperimentRunStore";
import { InMemoryLlmopsObservationStore } from "../llmops/InMemoryLlmopsObservationStore";
import { InMemoryModelRegistry } from "../llmops/InMemoryModelRegistry";
import { InMemoryPromptRegistry } from "../llmops/InMemoryPromptRegistry";
import { InMemoryServingConfigStore } from "../llmops/InMemoryServingConfigStore";

/**
 * Optional registry labels (host may seed from `LLM_MODEL`).
 * Soft-link strings only — does not bind LanguageModelProvider.
 */
export interface LlmopsControlPlaneServingLabels {
  modelName?: string;
  providerModel?: string;
  promptTemplateName?: string;
  promptBody?: string;
}

/**
 * Input for one thin LLMOps control-plane HTTP/application run.
 * Empty body `{}` is valid; metrics default to demo-passing values.
 */
export interface RunLlmopsControlPlaneInput {
  workspaceId: string;
  metrics?: Readonly<Record<string, number>>;
  /** Per-request override of registry labels (e.g. live Gemini model id). */
  servingLabels?: LlmopsControlPlaneServingLabels;
}

/**
 * JSON-friendly summary of Registry → Run → Gate → Regression → Serving → Obs.
 */
export interface RunLlmopsControlPlaneResultView {
  workspaceId: string;
  promptVersionId: string;
  modelVersionId: string;
  modelName: string;
  providerModel: string;
  experimentRunId: string;
  gateId: string;
  gatePassed: boolean;
  regressionPassed: boolean;
  servingConfigId: string;
  servingStatus: string;
  observationId: string;
  metrics: Readonly<Record<string, number>>;
}

const DEFAULT_METRICS: Readonly<Record<string, number>> = {
  hitRateAtK: 0.92,
  meanReciprocalRank: 0.81,
  latencyMs: 120,
};

const DEFAULT_LABELS: Readonly<Required<LlmopsControlPlaneServingLabels>> = {
  modelName: "fake-chat",
  providerModel: "fake-llm-v1",
  promptTemplateName: "cited-answer",
  promptBody: "Answer using evidence only.\nQuestion: {{query}}",
};

/**
 * Thin application use case: one InMemory control-plane story
 * (same shape as `pnpm demo:llmops:control-plane`). Soft-link ids only;
 * does not bind LanguageModelProvider. Depends on llmops InMemory adapters.
 */
export class RunLlmopsControlPlaneUseCase {
  private readonly defaults: Required<LlmopsControlPlaneServingLabels>;

  constructor(defaults: LlmopsControlPlaneServingLabels = {}) {
    this.defaults = {
      modelName: defaults.modelName?.trim() || DEFAULT_LABELS.modelName,
      providerModel:
        defaults.providerModel?.trim() || DEFAULT_LABELS.providerModel,
      promptTemplateName:
        defaults.promptTemplateName?.trim() ||
        DEFAULT_LABELS.promptTemplateName,
      promptBody: defaults.promptBody?.trim() || DEFAULT_LABELS.promptBody,
    };
  }

  async execute(
    input: RunLlmopsControlPlaneInput,
  ): Promise<RunLlmopsControlPlaneResultView> {
    if (!input || typeof input !== "object") {
      throw new Error("RunLlmopsControlPlaneInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error("workspaceId must be a non-empty string");
    }
    const workspaceId = input.workspaceId.trim();
    const metrics = resolveMetrics(input.metrics);
    const labels = resolveLabels(this.defaults, input.servingLabels);
    const suffix = randomUUID().slice(0, 8);
    const now = Date.now();

    const prompts = new InMemoryPromptRegistry();
    const models = new InMemoryModelRegistry();
    const runs = new InMemoryExperimentRunStore();
    const serving = new InMemoryServingConfigStore();
    const observations = new InMemoryLlmopsObservationStore();
    const gate = new DefaultEvaluationGateEvaluator();
    const regression = new DefaultRegressionHarness();

    const promptVersionId = asPromptVersionId(`pv-${suffix}`);
    const modelVersionId = asModelVersionId(`mv-${suffix}`);
    const runId = asExperimentRunId(`run-${suffix}`);
    const gateId = asEvaluationGateId(`gate-${suffix}`);
    const servingId = asServingConfigId(`svc-${suffix}`);
    const observationId = asLlmopsObservationId(`obs-${suffix}`);
    const templateId = asPromptTemplateId(`tpl-${suffix}`);
    const modelId = asModelId(`mdl-${suffix}`);

    await prompts.registerTemplate({
      id: templateId,
      workspaceId,
      name: labels.promptTemplateName,
    });
    await prompts.registerVersion({
      id: promptVersionId,
      templateId,
      workspaceId,
      version: "1.0.0",
      body: labels.promptBody,
    });
    await models.registerModel({
      id: modelId,
      workspaceId,
      name: labels.modelName,
    });
    await models.registerVersion({
      id: modelVersionId,
      modelId,
      workspaceId,
      version: "1.0.0",
      providerModel: labels.providerModel,
    });

    await runs.create({
      id: runId,
      experimentId: asExperimentId(`exp-${suffix}`),
      workspaceId,
      status: "running",
      params: {
        promptVersionId: String(promptVersionId),
        modelVersionId: String(modelVersionId),
        modelName: labels.modelName,
        providerModel: labels.providerModel,
      },
      startedAtUnixMs: now,
    });
    await runs.updateStatus({
      workspaceId,
      runId,
      status: "completed",
      metrics: { ...metrics },
      endedAtUnixMs: now + 500,
    });

    const gateResult = gate.evaluate({
      metrics: {
        hitRateAtK: metrics.hitRateAtK!,
        meanReciprocalRank: metrics.meanReciprocalRank!,
      },
      rules: [
        { metricKey: "hitRateAtK", comparator: "gte", threshold: 0.8 },
        { metricKey: "meanReciprocalRank", comparator: "gte", threshold: 0.7 },
      ],
    });

    const harness = regression.compare({
      baseline: { hitRateAtK: 0.9, meanReciprocalRank: 0.78 },
      candidate: {
        hitRateAtK: metrics.hitRateAtK!,
        meanReciprocalRank: metrics.meanReciprocalRank!,
      },
      tolerances: { hitRateAtK: 0.02, meanReciprocalRank: 0.02 },
    });

    await serving.register({
      id: servingId,
      workspaceId,
      name: "dev-main",
      environment: "dev",
      promptVersionId,
      modelVersionId,
      gateId,
      trafficPercent: 100,
    });
    const active = await serving.activate({
      workspaceId,
      id: servingId,
      activatedAtUnixMs: now + 1000,
    });

    await observations.record({
      id: observationId,
      workspaceId,
      recordedAtUnixMs: now + 1500,
      experimentRunId: runId,
      servingConfigId: servingId,
      quality: {
        hitRateAtK: metrics.hitRateAtK!,
        gatePass: gateResult.passed ? 1 : 0,
      },
      costUnits: 0.002,
      latencyMs: metrics.latencyMs ?? 0,
      attributes: {
        softMap: "llmops.quality/cost/latency",
        modelName: labels.modelName,
        providerModel: labels.providerModel,
      },
    });

    return {
      workspaceId,
      promptVersionId: String(promptVersionId),
      modelVersionId: String(modelVersionId),
      modelName: labels.modelName,
      providerModel: labels.providerModel,
      experimentRunId: String(runId),
      gateId: String(gateId),
      gatePassed: gateResult.passed,
      regressionPassed: harness.passed,
      servingConfigId: String(servingId),
      servingStatus: active.status,
      observationId: String(observationId),
      metrics: { ...metrics },
    };
  }
}

function resolveLabels(
  defaults: Required<LlmopsControlPlaneServingLabels>,
  override: LlmopsControlPlaneServingLabels | undefined,
): Required<LlmopsControlPlaneServingLabels> {
  if (override === undefined) {
    return { ...defaults };
  }
  if (
    override === null ||
    typeof override !== "object" ||
    Array.isArray(override)
  ) {
    throw new Error("servingLabels must be a plain object");
  }
  return {
    modelName: nonEmptyOr(override.modelName, defaults.modelName),
    providerModel: nonEmptyOr(override.providerModel, defaults.providerModel),
    promptTemplateName: nonEmptyOr(
      override.promptTemplateName,
      defaults.promptTemplateName,
    ),
    promptBody: nonEmptyOr(override.promptBody, defaults.promptBody),
  };
}

function nonEmptyOr(
  value: string | undefined,
  fallback: string,
): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function resolveMetrics(
  metrics: Readonly<Record<string, number>> | undefined,
): Readonly<Record<string, number>> {
  if (metrics === undefined) {
    return { ...DEFAULT_METRICS };
  }
  if (metrics === null || typeof metrics !== "object" || Array.isArray(metrics)) {
    throw new Error("metrics must be a plain object of numbers");
  }
  const out: Record<string, number> = { ...DEFAULT_METRICS };
  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`metrics.${key} must be a finite number`);
    }
    out[key] = value;
  }
  return out;
}
