/**
 * Dependency-free validation for RunLlmopsControlPlaneUseCase labels + metrics.
 */
import { RunLlmopsControlPlaneUseCase } from "./RunLlmopsControlPlaneUseCase";

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

  console.log("RunLlmopsControlPlaneUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
