import { readFileSync } from "node:fs";
import path from "node:path";

import {
  CreateKnowledgeDocumentUseCase,
  type CreateKnowledgeDocumentInput,
} from "./CreateKnowledgeDocumentUseCase";
import { ListKnowledgeDocumentsUseCase } from "./ListKnowledgeDocumentsUseCase";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import { DefaultInMemoryKnowledgeSourceRepository } from "../persistence/DefaultInMemoryKnowledgeSourceRepository";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";

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

async function registerSource(
  sourceRepository: KnowledgeSourceRepository,
  workspaceId: string,
  id: string = SOURCE_1,
): Promise<void> {
  await sourceRepository.save({ workspaceId, id, name: "Docs Portal" });
}

async function assertDependsOnPortNotAdapter(): Promise<void> {
  console.log("[application] create use case depends on ports, not adapters...");
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
    source.includes('from "../repository/KnowledgeSourceRepository"'),
    "Use case must import KnowledgeSourceRepository port",
  );
  assertTruthy(
    !source.includes("DefaultInMemoryRepository"),
    "Use case must not import DefaultInMemoryRepository adapter",
  );
  assertTruthy(
    !source.includes("DefaultInMemoryKnowledgeSourceRepository"),
    "Use case must not import DefaultInMemoryKnowledgeSourceRepository adapter",
  );
  assertTruthy(
    !source.includes("../persistence/"),
    "Use case must not import persistence adapters",
  );
}

async function assertCreatesAndPersists(): Promise<void> {
  console.log("[application] create persists knowledge document...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const sourceRepository: KnowledgeSourceRepository =
    new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_A);

  const create = new CreateKnowledgeDocumentUseCase(repository, sourceRepository);
  const list = new ListKnowledgeDocumentsUseCase(repository);

  const input: CreateKnowledgeDocumentInput = {
    workspaceId: WORKSPACE_A,
    id: " doc-1 ",
    sourceId: SOURCE_1,
    title: " Getting Started ",
    text: "Create flow for knowledge items.",
  };

  const created = await create.execute(input);
  assertEqual(created.id, "doc-1", "id should be trimmed");
  assertEqual(created.workspaceId, WORKSPACE_A, "workspaceId mismatch");
  assertEqual(created.sourceId, SOURCE_1, "sourceId mismatch");
  assertEqual(created.title, "Getting Started", "title should be trimmed");
  assertEqual(created.text, "Create flow for knowledge items.", "text mismatch");

  const stored = await repository.findById(WORKSPACE_A, "doc-1");
  assertTruthy(stored, "Expected document in repository after create");
  assertEqual(stored?.title, "Getting Started", "stored title mismatch");
  assertEqual(stored?.sourceId, SOURCE_1, "stored sourceId mismatch");

  const listed = await list.execute({ workspaceId: WORKSPACE_A });
  assertEqual(listed.length, 1, "list should include created document");
  assertEqual(listed[0]?.id, "doc-1", "listed id mismatch");
}

async function assertRejectsDuplicateId(): Promise<void> {
  console.log("[application] create rejects duplicate id...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const sourceRepository: KnowledgeSourceRepository =
    new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_A);
  const create = new CreateKnowledgeDocumentUseCase(repository, sourceRepository);

  await create.execute({
    workspaceId: WORKSPACE_A,
    id: "doc-dup",
    sourceId: SOURCE_1,
    title: "First",
    text: "body",
  });

  await assertRejects(
    create.execute({
      workspaceId: WORKSPACE_A,
      id: "doc-dup",
      sourceId: SOURCE_1,
      title: "Second",
      text: "other",
    }),
    "already exists",
  );
}

async function assertSameIdAllowedInDifferentWorkspace(): Promise<void> {
  console.log("[application] same id allowed in a different workspace...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const sourceRepository: KnowledgeSourceRepository =
    new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_A);
  await registerSource(sourceRepository, WORKSPACE_B);
  const create = new CreateKnowledgeDocumentUseCase(repository, sourceRepository);

  await create.execute({
    workspaceId: WORKSPACE_A,
    id: "doc-dup",
    sourceId: SOURCE_1,
    title: "Workspace A",
    text: "body",
  });

  const createdInB = await create.execute({
    workspaceId: WORKSPACE_B,
    id: "doc-dup",
    sourceId: SOURCE_1,
    title: "Workspace B",
    text: "other body",
  });
  assertEqual(createdInB.workspaceId, WORKSPACE_B, "workspaceId mismatch");

  const inA = await repository.findById(WORKSPACE_A, "doc-dup");
  const inB = await repository.findById(WORKSPACE_B, "doc-dup");
  assertEqual(inA?.title, "Workspace A", "workspace A document unaffected");
  assertEqual(inB?.title, "Workspace B", "workspace B document created independently");
}

async function assertRejectsMissingSource(): Promise<void> {
  console.log("[application] create rejects reference to an unregistered source...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const sourceRepository: KnowledgeSourceRepository =
    new DefaultInMemoryKnowledgeSourceRepository();
  const create = new CreateKnowledgeDocumentUseCase(repository, sourceRepository);

  await assertRejects(
    create.execute({
      workspaceId: WORKSPACE_A,
      id: "doc-orphan",
      sourceId: "does-not-exist",
      title: "Orphan",
      text: "body",
    }),
    "KnowledgeSource not found",
  );

  const stored = await repository.findById(WORKSPACE_A, "doc-orphan");
  assertEqual(stored, null, "Document must not be saved when its source is missing");
}

async function assertRejectsCrossWorkspaceSourceReference(): Promise<void> {
  console.log("[application] create rejects a source registered in a different workspace...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const sourceRepository: KnowledgeSourceRepository =
    new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_B);
  const create = new CreateKnowledgeDocumentUseCase(repository, sourceRepository);

  await assertRejects(
    create.execute({
      workspaceId: WORKSPACE_A,
      id: "doc-cross",
      sourceId: SOURCE_1,
      title: "Cross Workspace",
      text: "body",
    }),
    "KnowledgeSource not found",
  );

  const stored = await repository.findById(WORKSPACE_A, "doc-cross");
  assertEqual(stored, null, "Document must not be saved when source belongs to another workspace");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[application] create rejects invalid input...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const sourceRepository: KnowledgeSourceRepository =
    new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_A);
  const create = new CreateKnowledgeDocumentUseCase(repository, sourceRepository);

  await assertRejects(
    create.execute({
      workspaceId: WORKSPACE_A,
      id: " ",
      sourceId: SOURCE_1,
      title: "Valid",
      text: "body",
    }),
    "id must be a non-empty string",
  );
  await assertRejects(
    create.execute({
      workspaceId: WORKSPACE_A,
      id: "doc-x",
      sourceId: SOURCE_1,
      title: "",
      text: "body",
    }),
    "title must be a non-empty string",
  );
  await assertRejects(
    create.execute({
      workspaceId: " ",
      id: "doc-y",
      sourceId: SOURCE_1,
      title: "Valid",
      text: "body",
    }),
    "workspaceId must be a non-empty string",
  );
  await assertRejects(
    create.execute({
      workspaceId: WORKSPACE_A,
      id: "doc-z",
      sourceId: " ",
      title: "Valid",
      text: "body",
    }),
    "sourceId must be a non-empty string",
  );
}

async function main(): Promise<void> {
  await assertDependsOnPortNotAdapter();
  await assertCreatesAndPersists();
  await assertRejectsDuplicateId();
  await assertSameIdAllowedInDifferentWorkspace();
  await assertRejectsMissingSource();
  await assertRejectsCrossWorkspaceSourceReference();
  await assertRejectsInvalidInput();
  console.log("CreateKnowledgeDocumentUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
