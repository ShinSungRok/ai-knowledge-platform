import { InMemorySqlGateway } from "../infra/InMemorySqlGateway";
import type { KnowledgeSource } from "../domain/KnowledgeSource";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";
import { SqlKnowledgeSourceRepository } from "./SqlKnowledgeSourceRepository";

const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";

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

function buildRepository(): KnowledgeSourceRepository {
  return new SqlKnowledgeSourceRepository(new InMemorySqlGateway());
}

async function assertSaveAndFindById(): Promise<void> {
  console.log("[repository:sql-source] save + findById...");
  const repository = buildRepository();
  const source: KnowledgeSource = {
    workspaceId: WORKSPACE_A,
    id: "source-1",
    name: "Internal Wiki",
  };
  await repository.save(source);
  const found = await repository.findById(WORKSPACE_A, "source-1");
  assertEqual(found?.name, "Internal Wiki", "name");
}

async function assertFindMissingReturnsNull(): Promise<void> {
  console.log("[repository:sql-source] findById missing returns null...");
  const repository = buildRepository();
  assertEqual(await repository.findById(WORKSPACE_A, "missing"), null, "null");
}

async function assertDefensiveCopy(): Promise<void> {
  console.log("[repository:sql-source] defensive copy...");
  const repository = buildRepository();
  const source: KnowledgeSource = {
    workspaceId: WORKSPACE_A,
    id: "source-2",
    name: "Mutable",
  };
  await repository.save(source);
  source.name = "mutated-input";
  const stored = await repository.findById(WORKSPACE_A, "source-2");
  assertEqual(stored?.name, "Mutable", "input");
  if (!stored) {
    throw new Error("expected stored");
  }
  stored.name = "mutated-output";
  assertEqual(
    (await repository.findById(WORKSPACE_A, "source-2"))?.name,
    "Mutable",
    "output",
  );
}

async function assertValidationAndIsolation(): Promise<void> {
  console.log("[repository:sql-source] validation + workspace isolation...");
  const repository = buildRepository();
  await assertRejects(
    repository.save({ workspaceId: WORKSPACE_A, id: " ", name: "Valid" }),
    "id must be a non-empty string",
  );
  await repository.save({
    workspaceId: WORKSPACE_A,
    id: "shared-id",
    name: "A",
  });
  await repository.save({
    workspaceId: WORKSPACE_B,
    id: "shared-id",
    name: "B",
  });
  assertEqual(
    (await repository.findById(WORKSPACE_A, "shared-id"))?.name,
    "A",
    "A",
  );
  assertEqual(
    (await repository.findById(WORKSPACE_B, "shared-id"))?.name,
    "B",
    "B",
  );
  assertEqual(
    await repository.findById(WORKSPACE_B, "only-in-a"),
    null,
    "cross-workspace",
  );
}

async function main(): Promise<void> {
  await assertSaveAndFindById();
  await assertFindMissingReturnsNull();
  await assertDefensiveCopy();
  await assertValidationAndIsolation();
  console.log("SqlKnowledgeSourceRepository validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
