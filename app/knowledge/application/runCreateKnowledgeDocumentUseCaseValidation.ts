import { readFileSync } from "node:fs";
import path from "node:path";

import {
  CreateKnowledgeDocumentUseCase,
  type CreateKnowledgeDocumentInput,
} from "./CreateKnowledgeDocumentUseCase";
import { ListKnowledgeDocumentsUseCase } from "./ListKnowledgeDocumentsUseCase";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

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

async function assertDependsOnPortNotAdapter(): Promise<void> {
  console.log("[application] create use case depends on port, not adapter...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/CreateKnowledgeDocumentUseCase.ts",
  );
  const source = readFileSync(useCasePath, "utf8");

  assertTruthy(
    source.includes('from "../repository/KnowledgeDocumentRepository"'),
    "Use case must import KnowledgeDocumentRepository port",
  );
  assertTruthy(
    !source.includes("DefaultInMemoryRepository"),
    "Use case must not import DefaultInMemoryRepository adapter",
  );
  assertTruthy(
    !source.includes("../persistence/"),
    "Use case must not import persistence adapters",
  );
}

async function assertCreatesAndPersists(): Promise<void> {
  console.log("[application] create persists knowledge document...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const create = new CreateKnowledgeDocumentUseCase(repository);
  const list = new ListKnowledgeDocumentsUseCase(repository);

  const input: CreateKnowledgeDocumentInput = {
    id: " doc-1 ",
    title: " Getting Started ",
    text: "Create flow for knowledge items.",
  };

  const created = await create.execute(input);
  assertEqual(created.id, "doc-1", "id should be trimmed");
  assertEqual(created.title, "Getting Started", "title should be trimmed");
  assertEqual(created.text, "Create flow for knowledge items.", "text mismatch");

  const stored = await repository.findById("doc-1");
  assertTruthy(stored, "Expected document in repository after create");
  assertEqual(stored?.title, "Getting Started", "stored title mismatch");

  const listed = await list.execute();
  assertEqual(listed.length, 1, "list should include created document");
  assertEqual(listed[0]?.id, "doc-1", "listed id mismatch");
}

async function assertRejectsDuplicateId(): Promise<void> {
  console.log("[application] create rejects duplicate id...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const create = new CreateKnowledgeDocumentUseCase(repository);

  await create.execute({
    id: "doc-dup",
    title: "First",
    text: "body",
  });

  await assertRejects(
    create.execute({
      id: "doc-dup",
      title: "Second",
      text: "other",
    }),
    "already exists",
  );
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[application] create rejects invalid input...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const create = new CreateKnowledgeDocumentUseCase(repository);

  await assertRejects(
    create.execute({
      id: " ",
      title: "Valid",
      text: "body",
    }),
    "id must be a non-empty string",
  );
  await assertRejects(
    create.execute({
      id: "doc-x",
      title: "",
      text: "body",
    }),
    "title must be a non-empty string",
  );
}

async function main(): Promise<void> {
  await assertDependsOnPortNotAdapter();
  await assertCreatesAndPersists();
  await assertRejectsDuplicateId();
  await assertRejectsInvalidInput();
  console.log("CreateKnowledgeDocumentUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
