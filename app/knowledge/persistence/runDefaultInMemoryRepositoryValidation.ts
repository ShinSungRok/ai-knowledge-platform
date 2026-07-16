import { DefaultInMemoryRepository } from "./DefaultInMemoryRepository";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

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

async function assertSaveAndFindById(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository] save + findById...");
  const document: KnowledgeDocument = {
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    sourceId: SOURCE_1,
    title: "Getting Started",
    text: "Knowledge platform domain storage.",
  };

  await repository.save(document);
  const found = await repository.findById(WORKSPACE_A, "doc-1");

  assertTruthy(found, "Expected document to be found after save");
  assertEqual(found?.id, "doc-1", "id mismatch");
  assertEqual(found?.workspaceId, WORKSPACE_A, "workspaceId mismatch");
  assertEqual(found?.sourceId, SOURCE_1, "sourceId mismatch");
  assertEqual(found?.title, "Getting Started", "title mismatch");
  assertEqual(
    found?.text,
    "Knowledge platform domain storage.",
    "text mismatch",
  );
}

async function assertFindMissingReturnsNull(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository] findById missing returns null...");
  const found = await repository.findById(WORKSPACE_A, "missing-id");
  assertEqual(found, null, "Expected null for missing document");
}

async function assertFindAllAndOverwrite(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository] findAll + overwrite...");
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
  assertEqual(all.length, 2, "Expected two documents");

  const updated = await repository.findById(WORKSPACE_A, "doc-1");
  assertEqual(
    updated?.title,
    "Getting Started (updated)",
    "overwrite title mismatch",
  );
  assertEqual(updated?.text, "Updated body", "overwrite text mismatch");
}

async function assertDefensiveCopy(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository] defensive copy on read/write...");
  const document: KnowledgeDocument = {
    workspaceId: WORKSPACE_A,
    id: "doc-3",
    sourceId: SOURCE_1,
    title: "Mutable",
    text: "original",
  };
  await repository.save(document);
  document.title = "mutated-input";
  document.text = "mutated-input-text";

  const stored = await repository.findById(WORKSPACE_A, "doc-3");
  assertEqual(stored?.title, "Mutable", "stored title mutated via input ref");
  assertEqual(stored?.text, "original", "stored text mutated via input ref");

  if (!stored) {
    throw new Error("Expected stored document");
  }
  stored.title = "mutated-output";
  const again = await repository.findById(WORKSPACE_A, "doc-3");
  assertEqual(again?.title, "Mutable", "stored title mutated via output ref");
}

async function assertPortContract(): Promise<void> {
  console.log("[repository] port contract (KnowledgeDocumentRepository)...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  assertTruthy(
    typeof repository.save === "function",
    "save must be defined",
  );
  assertTruthy(
    typeof repository.findById === "function",
    "findById must be defined",
  );
  assertTruthy(
    typeof repository.findAll === "function",
    "findAll must be defined",
  );
  assertTruthy(
    typeof repository.deleteById === "function",
    "deleteById must be defined",
  );
}

async function assertValidationErrors(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository] input validation...");
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
    repository.save({
      workspaceId: WORKSPACE_A,
      id: "doc-x",
      sourceId: SOURCE_1,
      title: "",
      text: "body",
    }),
    "title must be a non-empty string",
  );
  await assertRejects(
    repository.save({
      workspaceId: " ",
      id: "doc-x",
      sourceId: SOURCE_1,
      title: "Valid",
      text: "body",
    }),
    "workspaceId must be a non-empty string",
  );
  await assertRejects(
    repository.save({
      workspaceId: WORKSPACE_A,
      id: "doc-x",
      sourceId: " ",
      title: "Valid",
      text: "body",
    }),
    "sourceId must be a non-empty string",
  );
  await assertRejects(
    repository.findById(WORKSPACE_A, ""),
    "id must be a non-empty string",
  );
  await assertRejects(
    repository.findById("", "doc-x"),
    "workspaceId must be a non-empty string",
  );
  await assertRejects(
    repository.findAll(""),
    "workspaceId must be a non-empty string",
  );
  await assertRejects(
    repository.deleteById(WORKSPACE_A, ""),
    "id must be a non-empty string",
  );
  await assertRejects(
    repository.deleteById("", "doc-x"),
    "workspaceId must be a non-empty string",
  );
}

async function assertDeleteById(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository] deleteById...");
  await repository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-del",
    sourceId: SOURCE_1,
    title: "Delete Me",
    text: "temporary",
  });
  await repository.deleteById(WORKSPACE_A, "doc-del");
  const found = await repository.findById(WORKSPACE_A, "doc-del");
  assertEqual(found, null, "Expected document removed after deleteById");
}

async function assertSameIdIndependentAcrossWorkspaces(): Promise<void> {
  console.log("[repository] same id independent across workspaces...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();

  await repository.save({
    workspaceId: WORKSPACE_A,
    id: "shared-id",
    sourceId: SOURCE_1,
    title: "Workspace A Title",
    text: "Workspace A body",
  });
  await repository.save({
    workspaceId: WORKSPACE_B,
    id: "shared-id",
    sourceId: SOURCE_1,
    title: "Workspace B Title",
    text: "Workspace B body",
  });

  const inA = await repository.findById(WORKSPACE_A, "shared-id");
  const inB = await repository.findById(WORKSPACE_B, "shared-id");
  assertEqual(inA?.title, "Workspace A Title", "workspace A title mismatch");
  assertEqual(inB?.title, "Workspace B Title", "workspace B title mismatch");

  await repository.deleteById(WORKSPACE_A, "shared-id");
  const stillInB = await repository.findById(WORKSPACE_B, "shared-id");
  assertTruthy(stillInB, "Deleting in workspace A must not affect workspace B");
  const goneFromA = await repository.findById(WORKSPACE_A, "shared-id");
  assertEqual(goneFromA, null, "Expected shared-id removed from workspace A only");
}

async function assertCrossWorkspaceIsolation(): Promise<void> {
  console.log("[repository] cross-workspace access is blocked...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();

  await repository.save({
    workspaceId: WORKSPACE_A,
    id: "only-in-a",
    sourceId: SOURCE_1,
    title: "Only In A",
    text: "body",
  });

  const foundInB = await repository.findById(WORKSPACE_B, "only-in-a");
  assertEqual(foundInB, null, "Workspace B must not see workspace A documents");

  const allInB = await repository.findAll(WORKSPACE_B);
  assertEqual(allInB.length, 0, "Workspace B findAll must not include workspace A documents");

  const allInA = await repository.findAll(WORKSPACE_A);
  assertEqual(allInA.length, 1, "Workspace A findAll must include its own document");
}

async function main(): Promise<void> {
  await assertPortContract();

  const repository = new DefaultInMemoryRepository();
  await assertSaveAndFindById(repository);
  await assertFindMissingReturnsNull(repository);
  await assertFindAllAndOverwrite(repository);
  await assertDefensiveCopy(repository);
  await assertDeleteById(repository);
  await assertValidationErrors(new DefaultInMemoryRepository());
  await assertSameIdIndependentAcrossWorkspaces();
  await assertCrossWorkspaceIsolation();

  console.log("DefaultInMemoryRepository validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
