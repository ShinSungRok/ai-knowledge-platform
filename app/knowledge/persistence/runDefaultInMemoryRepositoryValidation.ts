import { DefaultInMemoryRepository } from "./DefaultInMemoryRepository";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

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
    id: "doc-1",
    title: "Getting Started",
    text: "Knowledge platform domain storage.",
  };

  await repository.save(document);
  const found = await repository.findById("doc-1");

  assertTruthy(found, "Expected document to be found after save");
  assertEqual(found?.id, "doc-1", "id mismatch");
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
  const found = await repository.findById("missing-id");
  assertEqual(found, null, "Expected null for missing document");
}

async function assertFindAllAndOverwrite(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository] findAll + overwrite...");
  await repository.save({
    id: "doc-2",
    title: "Second",
    text: "Another document",
  });
  await repository.save({
    id: "doc-1",
    title: "Getting Started (updated)",
    text: "Updated body",
  });

  const all = await repository.findAll();
  assertEqual(all.length, 2, "Expected two documents");

  const updated = await repository.findById("doc-1");
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
    id: "doc-3",
    title: "Mutable",
    text: "original",
  };
  await repository.save(document);
  document.title = "mutated-input";
  document.text = "mutated-input-text";

  const stored = await repository.findById("doc-3");
  assertEqual(stored?.title, "Mutable", "stored title mutated via input ref");
  assertEqual(stored?.text, "original", "stored text mutated via input ref");

  if (!stored) {
    throw new Error("Expected stored document");
  }
  stored.title = "mutated-output";
  const again = await repository.findById("doc-3");
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
}

async function assertValidationErrors(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  console.log("[repository] input validation...");
  await assertRejects(
    repository.save({
      id: " ",
      title: "Valid",
      text: "body",
    }),
    "id must be a non-empty string",
  );
  await assertRejects(
    repository.save({
      id: "doc-x",
      title: "",
      text: "body",
    }),
    "title must be a non-empty string",
  );
  await assertRejects(repository.findById(""), "id must be a non-empty string");
}

async function main(): Promise<void> {
  await assertPortContract();

  const repository = new DefaultInMemoryRepository();
  await assertSaveAndFindById(repository);
  await assertFindMissingReturnsNull(repository);
  await assertFindAllAndOverwrite(repository);
  await assertDefensiveCopy(repository);
  await assertValidationErrors(new DefaultInMemoryRepository());

  console.log("DefaultInMemoryRepository validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
