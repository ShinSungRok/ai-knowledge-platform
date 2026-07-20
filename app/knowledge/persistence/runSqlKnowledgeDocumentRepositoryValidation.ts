import { InMemorySqlGateway } from "../infra/InMemorySqlGateway";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import { SqlKnowledgeDocumentRepository } from "./SqlKnowledgeDocumentRepository";

const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";
const SOURCE_1 = "source-1";

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

function buildRepository(): KnowledgeDocumentRepository {
  return new SqlKnowledgeDocumentRepository(new InMemorySqlGateway());
}

async function assertSaveAndFindById(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository:sql] save + findById...");
  const document: KnowledgeDocument = {
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    sourceId: SOURCE_1,
    title: "Getting Started",
    text: "Knowledge platform domain storage.",
  };
  await repository.save(document);
  const found = await repository.findById(WORKSPACE_A, "doc-1");
  assertTruthy(found, "Expected document after save");
  assertEqual(found?.title, "Getting Started", "title");
  assertEqual(found?.sourceId, SOURCE_1, "sourceId");
}

async function assertFindMissingReturnsNull(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository:sql] findById missing returns null...");
  assertEqual(
    await repository.findById(WORKSPACE_A, "missing-id"),
    null,
    "missing",
  );
}

async function assertFindAllAndOverwrite(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository:sql] findAll + overwrite + id ascending...");
  await repository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-2",
    sourceId: SOURCE_1,
    title: "Second",
    text: "Another document",
  });
  await repository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    sourceId: SOURCE_1,
    title: "Getting Started (updated)",
    text: "Updated body",
  });
  const all = await repository.findAll(WORKSPACE_A);
  assertEqual(all.length, 2, "two documents");
  assertEqual(all[0]!.id, "doc-1", "id ascending first");
  assertEqual(all[1]!.id, "doc-2", "id ascending second");
  const updated = await repository.findById(WORKSPACE_A, "doc-1");
  assertEqual(updated?.title, "Getting Started (updated)", "overwrite");
}

async function assertDefensiveCopy(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository:sql] defensive copy on read/write...");
  const document: KnowledgeDocument = {
    workspaceId: WORKSPACE_A,
    id: "doc-3",
    sourceId: SOURCE_1,
    title: "Mutable",
    text: "original",
  };
  await repository.save(document);
  document.title = "mutated-input";
  const stored = await repository.findById(WORKSPACE_A, "doc-3");
  assertEqual(stored?.title, "Mutable", "input mutation");
  if (!stored) {
    throw new Error("expected stored");
  }
  stored.title = "mutated-output";
  const again = await repository.findById(WORKSPACE_A, "doc-3");
  assertEqual(again?.title, "Mutable", "output mutation");
}

async function assertDeleteById(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository:sql] deleteById...");
  await repository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-del",
    sourceId: SOURCE_1,
    title: "Delete Me",
    text: "temporary",
  });
  await repository.deleteById(WORKSPACE_A, "doc-del");
  assertEqual(
    await repository.findById(WORKSPACE_A, "doc-del"),
    null,
    "deleted",
  );
}

async function assertValidationErrors(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository:sql] input validation...");
  await assertRejects(
    repository.save({
      workspaceId: WORKSPACE_A,
      id: " ",
      sourceId: SOURCE_1,
      title: "Valid",
      text: "body",
    }),
    "id must be a non-empty string",
  );
  await assertRejects(
    repository.findAll(""),
    "workspaceId must be a non-empty string",
  );
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[repository:sql] workspace isolation...");
  const repository = buildRepository();
  await repository.save({
    workspaceId: WORKSPACE_A,
    id: "shared-id",
    sourceId: SOURCE_1,
    title: "Workspace A Title",
    text: "A",
  });
  await repository.save({
    workspaceId: WORKSPACE_B,
    id: "shared-id",
    sourceId: SOURCE_1,
    title: "Workspace B Title",
    text: "B",
  });
  assertEqual(
    (await repository.findById(WORKSPACE_A, "shared-id"))?.title,
    "Workspace A Title",
    "A title",
  );
  assertEqual(
    (await repository.findById(WORKSPACE_B, "shared-id"))?.title,
    "Workspace B Title",
    "B title",
  );
  await repository.deleteById(WORKSPACE_A, "shared-id");
  assertTruthy(
    await repository.findById(WORKSPACE_B, "shared-id"),
    "B unaffected",
  );
  assertEqual(
    await repository.findById(WORKSPACE_B, "only-in-a"),
    null,
    "cross-workspace miss",
  );
}

async function main(): Promise<void> {
  const repository = buildRepository();
  await assertSaveAndFindById(repository);
  await assertFindMissingReturnsNull(repository);
  await assertFindAllAndOverwrite(repository);
  await assertDefensiveCopy(repository);
  await assertDeleteById(repository);
  await assertValidationErrors(buildRepository());
  await assertWorkspaceIsolation();
  console.log("SqlKnowledgeDocumentRepository validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
