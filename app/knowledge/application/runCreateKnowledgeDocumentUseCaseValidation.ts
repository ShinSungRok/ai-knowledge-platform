import { readFileSync } from "node:fs";
import path from "node:path";

import {
  CreateKnowledgeDocumentUseCase,
  type CreateKnowledgeDocumentInput,
} from "./CreateKnowledgeDocumentUseCase";
import { ListKnowledgeDocumentsUseCase } from "./ListKnowledgeDocumentsUseCase";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

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
    workspaceId: WORKSPACE_A,
    id: " doc-1 ",
    title: " Getting Started ",
    text: "Create flow for knowledge items.",
  };

  const created = await create.execute(input);
  assertEqual(created.id, "doc-1", "id should be trimmed");
  assertEqual(created.workspaceId, WORKSPACE_A, "workspaceId mismatch");
  assertEqual(created.title, "Getting Started", "title should be trimmed");
  assertEqual(created.text, "Create flow for knowledge items.", "text mismatch");

  const stored = await repository.findById(WORKSPACE_A, "doc-1");
  assertTruthy(stored, "Expected document in repository after create");
  assertEqual(stored?.title, "Getting Started", "stored title mismatch");

  const listed = await list.execute({ workspaceId: WORKSPACE_A });
  assertEqual(listed.length, 1, "list should include created document");
  assertEqual(listed[0]?.id, "doc-1", "listed id mismatch");
}

async function assertRejectsDuplicateId(): Promise<void> {
  console.log("[application] create rejects duplicate id...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const create = new CreateKnowledgeDocumentUseCase(repository);

  await create.execute({
    workspaceId: WORKSPACE_A,
    id: "doc-dup",
    title: "First",
    text: "body",
  });

  await assertRejects(
    create.execute({
      workspaceId: WORKSPACE_A,
      id: "doc-dup",
      title: "Second",
      text: "other",
    }),
    "already exists",
  );
}

async function assertSameIdAllowedInDifferentWorkspace(): Promise<void> {
  console.log("[application] same id allowed in a different workspace...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const create = new CreateKnowledgeDocumentUseCase(repository);

  await create.execute({
    workspaceId: WORKSPACE_A,
    id: "doc-dup",
    title: "Workspace A",
    text: "body",
  });

  const createdInB = await create.execute({
    workspaceId: WORKSPACE_B,
    id: "doc-dup",
    title: "Workspace B",
    text: "other body",
  });
  assertEqual(createdInB.workspaceId, WORKSPACE_B, "workspaceId mismatch");

  const inA = await repository.findById(WORKSPACE_A, "doc-dup");
  const inB = await repository.findById(WORKSPACE_B, "doc-dup");
  assertEqual(inA?.title, "Workspace A", "workspace A document unaffected");
  assertEqual(inB?.title, "Workspace B", "workspace B document created independently");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[application] create rejects invalid input...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const create = new CreateKnowledgeDocumentUseCase(repository);

  await assertRejects(
    create.execute({
      workspaceId: WORKSPACE_A,
      id: " ",
      title: "Valid",
      text: "body",
    }),
    "id must be a non-empty string",
  );
  await assertRejects(
    create.execute({
      workspaceId: WORKSPACE_A,
      id: "doc-x",
      title: "",
      text: "body",
    }),
    "title must be a non-empty string",
  );
  await assertRejects(
    create.execute({
      workspaceId: " ",
      id: "doc-y",
      title: "Valid",
      text: "body",
    }),
    "workspaceId must be a non-empty string",
  );
}

async function main(): Promise<void> {
  await assertDependsOnPortNotAdapter();
  await assertCreatesAndPersists();
  await assertRejectsDuplicateId();
  await assertSameIdAllowedInDifferentWorkspace();
  await assertRejectsInvalidInput();
  console.log("CreateKnowledgeDocumentUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
