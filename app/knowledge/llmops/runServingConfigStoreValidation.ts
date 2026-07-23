import { asEvaluationGateId } from "./EvaluationGateId";
import { asModelVersionId } from "./ModelVersionId";
import { asPromptVersionId } from "./PromptVersionId";
import { asServingConfigId } from "./ServingConfigId";
import { InMemoryServingConfigStore } from "./InMemoryServingConfigStore";
import type { ServingConfigRegisterInput } from "./ServingConfigStore";
import type { ServingConfigStore } from "./ServingConfigStore";

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

async function assertThrowsAsync(
  fn: () => Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected error message to include "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected async throw containing: ${messageSubstring}`);
}

function sampleRegister(
  overrides: Partial<ServingConfigRegisterInput> = {},
): ServingConfigRegisterInput {
  const {
    id: overrideId,
    workspaceId,
    name,
    environment,
    status,
    promptVersionId: overridePromptVersionId,
    modelVersionId: overrideModelVersionId,
    gateId,
    trafficPercent,
    metadata,
    activatedAtUnixMs,
    retiredAtUnixMs,
  } = overrides;
  const input: ServingConfigRegisterInput = {
    id: asServingConfigId(
      typeof overrideId === "string" ? overrideId : "svc-1",
    ),
    workspaceId: workspaceId ?? "workspace-a",
    name: name ?? "main",
    environment: environment ?? "dev",
    promptVersionId: asPromptVersionId(
      typeof overridePromptVersionId === "string"
        ? overridePromptVersionId
        : "pv-1",
    ),
    modelVersionId: asModelVersionId(
      typeof overrideModelVersionId === "string"
        ? overrideModelVersionId
        : "mv-1",
    ),
  };
  if (status !== undefined) {
    input.status = status;
  }
  if (gateId !== undefined) {
    input.gateId = gateId;
  }
  if (trafficPercent !== undefined) {
    input.trafficPercent = trafficPercent;
  }
  if (metadata !== undefined) {
    input.metadata = metadata;
  }
  if (activatedAtUnixMs !== undefined) {
    input.activatedAtUnixMs = activatedAtUnixMs;
  }
  if (retiredAtUnixMs !== undefined) {
    input.retiredAtUnixMs = retiredAtUnixMs;
  }
  return input;
}

function buildStore(): ServingConfigStore {
  return new InMemoryServingConfigStore();
}

async function assertHappyPath(): Promise<void> {
  console.log("[llmops-serving] register/get/list happy path...");
  const store = buildStore();
  await store.register(
    sampleRegister({
      id: asServingConfigId("svc-b"),
      name: "beta",
    }),
  );
  await store.register(
    sampleRegister({
      id: asServingConfigId("svc-a"),
      name: "alpha",
      gateId: asEvaluationGateId("gate-1"),
      trafficPercent: 50,
    }),
  );
  const listed = await store.listByWorkspace("workspace-a");
  assertEqual(
    listed.map((c) => c.id).join(","),
    "svc-a,svc-b",
    "ordered by name then id",
  );
  assertEqual(
    (await store.getById("workspace-a", asServingConfigId("svc-a")))?.status,
    "draft",
    "default draft",
  );
}

async function assertDuplicateThrows(): Promise<void> {
  console.log("[llmops-serving] duplicate id throws...");
  const store = buildStore();
  await store.register(sampleRegister());
  await assertThrowsAsync(
    () => store.register(sampleRegister()),
    "Duplicate serving config id",
  );
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[llmops-serving] workspace isolation...");
  const store = buildStore();
  await store.register(sampleRegister({ workspaceId: "workspace-a" }));
  await store.register(
    sampleRegister({
      workspaceId: "workspace-b",
      id: asServingConfigId("svc-1"),
      name: "other",
    }),
  );
  assertEqual(
    (await store.listByWorkspace("workspace-a")).length,
    1,
    "workspace-a count",
  );
  assertEqual(
    (await store.getById("workspace-b", asServingConfigId("svc-1")))?.name,
    "other",
    "workspace-b isolated",
  );
}

async function assertActivatePromotesDraft(): Promise<void> {
  console.log("[llmops-serving] activate draft → active...");
  const store = buildStore();
  await store.register(sampleRegister());
  const activated = await store.activate({
    workspaceId: "workspace-a",
    id: asServingConfigId("svc-1"),
    activatedAtUnixMs: 1000,
  });
  assertEqual(activated.status, "active", "activated");
  assertEqual(activated.activatedAtUnixMs, 1000, "activatedAt");
}

async function assertActivateRetiresPrevious(): Promise<void> {
  console.log("[llmops-serving] activate retires previous active in env...");
  const store = buildStore();
  await store.register(
    sampleRegister({
      id: asServingConfigId("svc-old"),
      name: "old",
      environment: "staging",
    }),
  );
  await store.activate({
    workspaceId: "workspace-a",
    id: asServingConfigId("svc-old"),
    activatedAtUnixMs: 100,
  });
  await store.register(
    sampleRegister({
      id: asServingConfigId("svc-new"),
      name: "new",
      environment: "staging",
    }),
  );
  await store.activate({
    workspaceId: "workspace-a",
    id: asServingConfigId("svc-new"),
    activatedAtUnixMs: 200,
  });
  assertEqual(
    (await store.getById("workspace-a", asServingConfigId("svc-old")))
      ?.status,
    "retired",
    "old retired",
  );
  assertEqual(
    (await store.getById("workspace-a", asServingConfigId("svc-new")))
      ?.status,
    "active",
    "new active",
  );
}

async function assertDifferentEnvironmentsIndependent(): Promise<void> {
  console.log("[llmops-serving] different environments each one active...");
  const store = buildStore();
  await store.register(
    sampleRegister({
      id: asServingConfigId("svc-dev"),
      name: "dev",
      environment: "dev",
    }),
  );
  await store.register(
    sampleRegister({
      id: asServingConfigId("svc-prod"),
      name: "prod",
      environment: "production",
    }),
  );
  await store.activate({
    workspaceId: "workspace-a",
    id: asServingConfigId("svc-dev"),
  });
  await store.activate({
    workspaceId: "workspace-a",
    id: asServingConfigId("svc-prod"),
  });
  assertEqual(
    (await store.getById("workspace-a", asServingConfigId("svc-dev")))
      ?.status,
    "active",
    "dev still active",
  );
  assertEqual(
    (await store.getById("workspace-a", asServingConfigId("svc-prod")))
      ?.status,
    "active",
    "prod active",
  );
  const staging = await store.listByEnvironment("workspace-a", "staging");
  assertEqual(staging.length, 0, "no staging configs");
}

async function assertRetireAndInvalidTransitions(): Promise<void> {
  console.log("[llmops-serving] retire and invalid transitions...");
  const store = buildStore();
  await store.register(sampleRegister());
  await store.retire({
    workspaceId: "workspace-a",
    id: asServingConfigId("svc-1"),
    retiredAtUnixMs: 300,
  });
  assertEqual(
    (await store.getById("workspace-a", asServingConfigId("svc-1")))?.status,
    "retired",
    "retired",
  );
  await assertThrowsAsync(
    () =>
      store.retire({
        workspaceId: "workspace-a",
        id: asServingConfigId("svc-1"),
      }),
    "already retired",
  );
  await assertThrowsAsync(
    () =>
      store.activate({
        workspaceId: "workspace-a",
        id: asServingConfigId("svc-1"),
      }),
    "Cannot activate retired",
  );
  await assertThrowsAsync(
    () =>
      store.activate({
        workspaceId: "workspace-a",
        id: asServingConfigId("missing"),
      }),
    "Unknown serving config id",
  );
}

async function assertTrafficPercentBounds(): Promise<void> {
  console.log("[llmops-serving] trafficPercent bounds...");
  const store = buildStore();
  await assertThrowsAsync(
    () =>
      store.register(
        sampleRegister({
          id: asServingConfigId("svc-bad"),
          trafficPercent: 101,
        }),
      ),
    "trafficPercent must be an integer from 0 to 100",
  );
  await assertThrowsAsync(
    () =>
      store.register(
        sampleRegister({
          id: asServingConfigId("svc-bad2"),
          trafficPercent: 1.5,
        }),
      ),
    "trafficPercent must be an integer from 0 to 100",
  );
}

async function assertDefensiveCopies(): Promise<void> {
  console.log("[llmops-serving] defensive copies...");
  const store = buildStore();
  const metadata = { owner: "team-a" };
  const created = await store.register(
    sampleRegister({
      metadata,
    }),
  );
  metadata.owner = "mutated-input";
  (created.metadata as { owner: string }).owner = "mutated-returned";
  const found = await store.getById("workspace-a", asServingConfigId("svc-1"));
  assertEqual(found?.metadata?.owner, "team-a", "metadata unchanged");
}

async function main(): Promise<void> {
  await assertHappyPath();
  await assertDuplicateThrows();
  await assertWorkspaceIsolation();
  await assertActivatePromotesDraft();
  await assertActivateRetiresPrevious();
  await assertDifferentEnvironmentsIndependent();
  await assertRetireAndInvalidTransitions();
  await assertTrafficPercentBounds();
  await assertDefensiveCopies();
  console.log("Serving config store validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
