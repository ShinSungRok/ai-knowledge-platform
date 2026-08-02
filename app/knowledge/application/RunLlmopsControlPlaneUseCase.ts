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
import type { EvaluationGateDefinition } from "../llmops/EvaluationGateDefinition";
import type { EvaluationGateDefinitionStore } from "../llmops/EvaluationGateDefinitionStore";
import type { EvaluationGateRule } from "../llmops/EvaluationGateRule";
import { InMemoryEvaluationGateDefinitionStore } from "../llmops/InMemoryEvaluationGateDefinitionStore";
import { InMemoryExperimentRunStore } from "../llmops/InMemoryExperimentRunStore";
import type { ExperimentRunStore } from "../llmops/ExperimentRunStore";
import { InMemoryLlmopsObservationStore } from "../llmops/InMemoryLlmopsObservationStore";
import type { LlmopsObservationStore } from "../llmops/LlmopsObservationStore";
import { InMemoryModelRegistry } from "../llmops/InMemoryModelRegistry";
import type { ModelRegistry } from "../llmops/ModelRegistry";
import { InMemoryPromptRegistry } from "../llmops/InMemoryPromptRegistry";
import type { PromptRegistry } from "../llmops/PromptRegistry";
import { InMemoryServingConfigStore } from "../llmops/InMemoryServingConfigStore";
import type { ServingConfigStore } from "../llmops/ServingConfigStore";
import type { ServingEnvironment } from "../llmops/ServingEnvironment";

/**
 * Optional registry labels (host may seed from `LLM_MODEL`).
 * Soft-link strings only — does not bind LanguageModelProvider.
 */
export interface LlmopsControlPlaneServingLabels {
  modelName?: string;
  providerModel?: string;
  promptTemplateName?: string;
  promptBody?: string;
  promptTemplateDescription?: string;
}

/**
 * Persistent store injection for {@link RunLlmopsControlPlaneUseCase}.
 * Each field defaults to a fresh InMemory adapter when omitted — passing
 * the same instances across many `execute()` calls (e.g. from composition)
 * is what makes registered prompts/models/runs/serving configs/observations
 * accumulate real history instead of being a write-then-discard demo.
 */
export interface LlmopsControlPlaneStores {
  prompts?: PromptRegistry;
  models?: ModelRegistry;
  runs?: ExperimentRunStore;
  serving?: ServingConfigStore;
  observations?: LlmopsObservationStore;
  gateDefinitions?: EvaluationGateDefinitionStore;
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
  /** Defaults to "dev" when omitted. */
  environment?: ServingEnvironment;
  /** Defaults to 100 when omitted. */
  trafficPercent?: number;
  /**
   * Optional custom gate rules for this run. When supplied, registers a
   * new {@link EvaluationGateDefinition} instead of reusing the
   * per-workspace default — reaches the `"eq"`/`"lte"` comparators live.
   */
  gateRules?: readonly EvaluationGateRule[];
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
  runStatus: string;
  gateId: string;
  gateDefinitionId: string;
  gatePassed: boolean;
  regressionPassed: boolean;
  servingConfigId: string;
  servingStatus: string;
  environment: string;
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
  promptTemplateDescription: "Cited-answer prompt template (soft-link only)",
};

const DEFAULT_GATE_DEFINITION_ID = "gate-def-default";
const DEFAULT_GATE_DEFINITION_NAME = "default-quality-gate";
const DEFAULT_GATE_RULES: readonly EvaluationGateRule[] = [
  { metricKey: "hitRateAtK", comparator: "gte", threshold: 0.8 },
  { metricKey: "meanReciprocalRank", comparator: "gte", threshold: 0.7 },
];

const VALID_ENVIRONMENTS: readonly ServingEnvironment[] = [
  "dev",
  "staging",
  "production",
];

/**
 * Thin application use case: one InMemory control-plane story
 * (same shape as `pnpm demo:llmops:control-plane`). Soft-link ids only;
 * does not bind LanguageModelProvider. Depends on llmops InMemory adapters
 * by default, or persistent stores injected via {@link LlmopsControlPlaneStores}
 * (composition wires one shared instance per store so repeated calls
 * accumulate real history instead of discarding it after one request).
 */
export class RunLlmopsControlPlaneUseCase {
  private readonly defaults: Required<LlmopsControlPlaneServingLabels>;
  private readonly prompts: PromptRegistry;
  private readonly models: ModelRegistry;
  private readonly runs: ExperimentRunStore;
  private readonly serving: ServingConfigStore;
  private readonly observations: LlmopsObservationStore;
  private readonly gateDefinitions: EvaluationGateDefinitionStore;

  constructor(
    defaults: LlmopsControlPlaneServingLabels = {},
    stores: LlmopsControlPlaneStores = {},
  ) {
    this.defaults = {
      modelName: defaults.modelName?.trim() || DEFAULT_LABELS.modelName,
      providerModel:
        defaults.providerModel?.trim() || DEFAULT_LABELS.providerModel,
      promptTemplateName:
        defaults.promptTemplateName?.trim() ||
        DEFAULT_LABELS.promptTemplateName,
      promptBody: defaults.promptBody?.trim() || DEFAULT_LABELS.promptBody,
      promptTemplateDescription:
        defaults.promptTemplateDescription?.trim() ||
        DEFAULT_LABELS.promptTemplateDescription,
    };
    this.prompts = stores.prompts ?? new InMemoryPromptRegistry();
    this.models = stores.models ?? new InMemoryModelRegistry();
    this.runs = stores.runs ?? new InMemoryExperimentRunStore();
    this.serving = stores.serving ?? new InMemoryServingConfigStore();
    this.observations =
      stores.observations ?? new InMemoryLlmopsObservationStore();
    this.gateDefinitions =
      stores.gateDefinitions ?? new InMemoryEvaluationGateDefinitionStore();
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
    const environment = resolveEnvironment(input.environment);
    const trafficPercent = resolveTrafficPercent(input.trafficPercent);
    // Full (not truncated) UUID: these ids now persist for the life of the
    // host process, so a truncated suffix's cumulative collision
    // probability would eventually surface as a real 500.
    const suffix = randomUUID();
    const now = Date.now();

    const promptVersionId = asPromptVersionId(`pv-${suffix}`);
    const modelVersionId = asModelVersionId(`mv-${suffix}`);
    const runId = asExperimentRunId(`run-${suffix}`);
    const gateId = asEvaluationGateId(`gate-${suffix}`);
    const servingId = asServingConfigId(`svc-${suffix}`);
    const observationId = asLlmopsObservationId(`obs-${suffix}`);
    const templateId = asPromptTemplateId(`tpl-${suffix}`);
    const modelId = asModelId(`mdl-${suffix}`);

    await this.prompts.registerTemplate({
      id: templateId,
      workspaceId,
      name: labels.promptTemplateName,
      description: labels.promptTemplateDescription,
    });
    await this.prompts.registerVersion({
      id: promptVersionId,
      templateId,
      workspaceId,
      version: "1.0.0",
      body: labels.promptBody,
    });
    await this.models.registerModel({
      id: modelId,
      workspaceId,
      name: labels.modelName,
    });
    await this.models.registerVersion({
      id: modelVersionId,
      modelId,
      workspaceId,
      version: "1.0.0",
      providerModel: labels.providerModel,
    });

    await this.runs.create({
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

    const gateDefinition = await this.resolveGateDefinition(
      workspaceId,
      input.gateRules,
      suffix,
    );
    const gate = new DefaultEvaluationGateEvaluator();
    const gateResult = gate.evaluate({
      metrics,
      rules: gateDefinition.rules,
    });

    const regression = new DefaultRegressionHarness();
    const harness = regression.compare({
      baseline: { hitRateAtK: 0.9, meanReciprocalRank: 0.78 },
      candidate: {
        hitRateAtK: metrics.hitRateAtK!,
        meanReciprocalRank: metrics.meanReciprocalRank!,
      },
      tolerances: { hitRateAtK: 0.02, meanReciprocalRank: 0.02 },
    });

    const passed = gateResult.passed && harness.passed;
    await this.runs.updateStatus({
      workspaceId,
      runId,
      status: passed ? "completed" : "failed",
      metrics: { ...metrics },
      endedAtUnixMs: now + 500,
      ...(passed
        ? {}
        : {
            error: !gateResult.passed
              ? "evaluation gate failed"
              : "regression check failed",
          }),
    });

    await this.serving.register({
      id: servingId,
      workspaceId,
      name: `${environment}-main`,
      environment,
      promptVersionId,
      modelVersionId,
      gateId,
      trafficPercent,
    });
    const active = await this.serving.activate({
      workspaceId,
      id: servingId,
      activatedAtUnixMs: now + 1000,
    });

    await this.observations.record({
      id: observationId,
      workspaceId,
      recordedAtUnixMs: now + 1500,
      experimentRunId: runId,
      servingConfigId: servingId,
      quality: {
        hitRateAtK: metrics.hitRateAtK!,
        meanReciprocalRank: metrics.meanReciprocalRank!,
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
      runStatus: passed ? "completed" : "failed",
      gateId: String(gateId),
      gateDefinitionId: String(gateDefinition.id),
      gatePassed: gateResult.passed,
      regressionPassed: harness.passed,
      servingConfigId: String(servingId),
      servingStatus: active.status,
      environment,
      observationId: String(observationId),
      metrics: { ...metrics },
    };
  }

  /**
   * Idempotently resolves the gate definition for this run: reuses the
   * per-workspace default (registering it once, the first time) unless the
   * caller supplied `gateRules`, in which case a fresh definition is
   * registered for this run alone.
   */
  private async resolveGateDefinition(
    workspaceId: string,
    overrideRules: readonly EvaluationGateRule[] | undefined,
    suffix: string,
  ): Promise<EvaluationGateDefinition> {
    if (overrideRules !== undefined) {
      if (!Array.isArray(overrideRules) || overrideRules.length === 0) {
        throw new Error("gateRules must be a non-empty array");
      }
      return this.gateDefinitions.register({
        id: asEvaluationGateId(`gate-def-${suffix}`),
        workspaceId,
        name: "custom-quality-gate",
        rules: overrideRules,
      });
    }
    const defaultId = asEvaluationGateId(DEFAULT_GATE_DEFINITION_ID);
    const existing = await this.gateDefinitions.getById(workspaceId, defaultId);
    if (existing !== null) {
      return existing;
    }
    return this.gateDefinitions.register({
      id: defaultId,
      workspaceId,
      name: DEFAULT_GATE_DEFINITION_NAME,
      rules: DEFAULT_GATE_RULES,
    });
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
    promptTemplateDescription: nonEmptyOr(
      override.promptTemplateDescription,
      defaults.promptTemplateDescription,
    ),
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

function resolveEnvironment(
  environment: ServingEnvironment | undefined,
): ServingEnvironment {
  if (environment === undefined) {
    return "dev";
  }
  if (
    typeof environment !== "string" ||
    !VALID_ENVIRONMENTS.includes(environment)
  ) {
    throw new Error('environment must be "dev" | "staging" | "production"');
  }
  return environment;
}

function resolveTrafficPercent(trafficPercent: number | undefined): number {
  if (trafficPercent === undefined) {
    return 100;
  }
  if (
    typeof trafficPercent !== "number" ||
    !Number.isInteger(trafficPercent) ||
    trafficPercent < 0 ||
    trafficPercent > 100
  ) {
    throw new Error("trafficPercent must be an integer from 0 to 100");
  }
  return trafficPercent;
}
