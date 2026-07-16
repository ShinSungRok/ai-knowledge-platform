import { DefaultInMemoryKnowledgeSourceRepository } from "./DefaultInMemoryKnowledgeSourceRepository";
import type { KnowledgeSource } from "../domain/KnowledgeSource";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";

const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} (actual=${String(actual)}, expected=${String(expected)})`);
  }
}

function assertRejects(
  promise: Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  return promise.then(
    () => {
      throw new Error(`Expected rejection containing: ${messageSubstring}`);
    },
    (error: unknown) => {
      const text = error instanceof Error ? error.message : String(error);
      assertTruthy(
        text.includes(messageSubstring),
        `Expected error message to include "${messageSubstring}", got: ${text}`,
      );
    },
  );
}

async function assertPortContract(): Promise<void> {
  console.log("[repository] port contract (KnowledgeSourceRepository)...");
  const repository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  assertTruthy(typeof repository.save === "function", "save must be defined");
  assertTruthy(typeof repository.findById === "function", "findById must be defined");
}

async function assertSaveAndFindById(
  repository: KnowledgeSourceRepository,
): Promise<void> {
  console.log("[repository] save + findById...");
  const source: KnowledgeSource = {
    workspaceId: WORKSPACE_A,
    id: "source-1",
    name: "Internal Wiki",
  };

  await repository.save(source);
  const found = await repository.findById(WORKSPACE_A, "source-1");

  assertTruthy(found, "Expected source to be found after save");
  assertEqual(found?.id, "source-1", "id mismatch");
  assertEqual(found?.workspaceId, WORKSPACE_A, "workspaceId mismatch");
  assertEqual(found?.name, "Internal Wiki", "name mismatch");
}

async function assertFindMissingReturnsNull(
  repository: KnowledgeSourceRepository,
): Promise<void> {
  console.log("[repository] findById missing returns null...");
  const found = await repository.findById(WORKSPACE_A, "missing-id");
  assertEqual(found, null, "Expected null for missing source");
}

async function assertDefensiveCopy(
  repository: KnowledgeSourceRepository,
): Promise<void> {
  console.log("[repository] defensive copy on read/write...");
  const source: KnowledgeSource = {
    workspaceId: WORKSPACE_A,
    id: "source-2",
    name: "Mutable",
  };
  await repository.save(source);
  source.name = "mutated-input";

  const stored = await repository.findById(WORKSPACE_A, "source-2");
  assertEqual(stored?.name, "Mutable", "stored name mutated via input ref");

  if (!stored) {
    throw new Error("Expected stored source");
  }
  stored.name = "mutated-output";
  const again = await repository.findById(WORKSPACE_A, "source-2");
  assertEqual(again?.name, "Mutable", "stored name mutated via output ref");
}

async function assertValidationErrors(
  repository: KnowledgeSourceRepository,
): Promise<void> {
  console.log("[repository] input validation...");
  await assertRejects(
    repository.save({ workspaceId: WORKSPACE_A, id: " ", name: "Valid" }),
    "id must be a non-empty string",
  );
  await assertRejects(
    repository.save({ workspaceId: WORKSPACE_A, id: "source-x", name: "" }),
    "name must be a non-empty string",
  );
  await assertRejects(
    repository.save({ workspaceId: " ", id: "source-x", name: "Valid" }),
    "workspaceId must be a non-empty string",
  );
  await assertRejects(
    repository.findById(WORKSPACE_A, ""),
    "id must be a non-empty string",
  );
  await assertRejects(
    repository.findById("", "source-x"),
    "workspaceId must be a non-empty string",
  );
}

async function assertSameIdIndependentAcrossWorkspaces(): Promise<void> {
  console.log("[repository] same id independent across workspaces...");
  const repository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();

  await repository.save({
    workspaceId: WORKSPACE_A,
    id: "shared-id",
    name: "Workspace A Source",
  });
  await repository.save({
    workspaceId: WORKSPACE_B,
    id: "shared-id",
    name: "Workspace B Source",
  });

  const inA = await repository.findById(WORKSPACE_A, "shared-id");
  const inB = await repository.findById(WORKSPACE_B, "shared-id");
  assertEqual(inA?.name, "Workspace A Source", "workspace A name mismatch");
  assertEqual(inB?.name, "Workspace B Source", "workspace B name mismatch");
}

async function assertCrossWorkspaceIsolation(): Promise<void> {
  console.log("[repository] cross-workspace access is blocked...");
  const repository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();

  await repository.save({
    workspaceId: WORKSPACE_A,
    id: "only-in-a",
    name: "Only In A",
  });

  const foundInB = await repository.findById(WORKSPACE_B, "only-in-a");
  assertEqual(foundInB, null, "Workspace B must not see workspace A sources");
}

async function main(): Promise<void> {
  await assertPortContract();

  const repository = new DefaultInMemoryKnowledgeSourceRepository();
  await assertSaveAndFindById(repository);
  await assertFindMissingReturnsNull(repository);
  await assertDefensiveCopy(repository);
  await assertValidationErrors(new DefaultInMemoryKnowledgeSourceRepository());
  await assertSameIdIndependentAcrossWorkspaces();
  await assertCrossWorkspaceIsolation();

  console.log("DefaultInMemoryKnowledgeSourceRepository validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
