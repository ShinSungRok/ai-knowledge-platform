import {
  KNOWLEDGE_MODULE_LLMOPS,
  asExperimentId,
  asExperimentRunId,
} from "./index";
import type { ExperimentRunRecord } from "./ExperimentRunRecord";
import type { ExperimentRunStatus } from "./ExperimentRunStatus";
import type {
  ExperimentRunCreateInput,
  ExperimentRunStore,
  ExperimentRunUpdateStatusInput,
} from "./ExperimentRunStore";
import type {
  ExperimentRunStore as TopLevelExperimentRunStore,
} from "../index";

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

/**
 * In-file Fake for Experiment/Run contract validation — port assignability only.
 */
class FakeExperimentRunStore implements ExperimentRunStore {
  async create(input: ExperimentRunCreateInput): Promise<ExperimentRunRecord> {
    return {
      id: input.id,
      experimentId: input.experimentId,
      workspaceId: input.workspaceId,
      status: input.status ?? "pending",
      params: { ...input.params },
    };
  }

  async getById(): Promise<ExperimentRunRecord | null> {
    return null;
  }

  async listByExperiment(): Promise<readonly ExperimentRunRecord[]> {
    return [];
  }

  async updateStatus(
    input: ExperimentRunUpdateStatusInput,
  ): Promise<ExperimentRunRecord> {
    return {
      id: input.runId,
      experimentId: asExperimentId("exp-fake"),
      workspaceId: input.workspaceId,
      status: input.status,
      params: {},
    };
  }
}

function assertModuleConstant(): void {
  console.log(
    "[llmops] KNOWLEDGE_MODULE_LLMOPS constant is exported correctly...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_LLMOPS,
    "app/knowledge/llmops",
    "unexpected KNOWLEDGE_MODULE_LLMOPS value",
  );
}

function assertStatusUnionSanity(): void {
  console.log("[llmops] ExperimentRunStatus union sanity...");
  const statuses: readonly ExperimentRunStatus[] = [
    "pending",
    "running",
    "completed",
    "failed",
  ];
  assertEqual(statuses.length, 4, "expected four statuses");
  assertEqual(asExperimentId(" exp-1 ").toString(), "exp-1", "trim experiment id");
  assertEqual(asExperimentRunId(" run-1 ").toString(), "run-1", "trim run id");
  try {
    asExperimentId("  ");
    throw new Error("expected empty ExperimentId to throw");
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes("non-empty"),
      `unexpected empty ExperimentId error: ${text}`,
    );
  }
}

function assertFakeStoreAssignability(): void {
  console.log("[llmops] FakeExperimentRunStore satisfies ExperimentRunStore...");
  const store: ExperimentRunStore = new FakeExperimentRunStore();
  const topLevel: TopLevelExperimentRunStore = store;
  assertTruthy(topLevel, "top-level ExperimentRunStore assignability");
}

async function main(): Promise<void> {
  assertModuleConstant();
  assertStatusUnionSanity();
  assertFakeStoreAssignability();
  console.log("Experiment run contract validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
