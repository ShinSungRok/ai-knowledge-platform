import { readFileSync } from "node:fs";
import path from "node:path";

import { CreateKnowledgeDocumentUseCase } from "./CreateKnowledgeDocumentUseCase";
import {
  UpdateKnowledgeDocumentUseCase,
  type UpdateKnowledgeDocumentInput,
} from "./UpdateKnowledgeDocumentUseCase";
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

async function assertDependsOnPortNotAdapter(): Promise<void> {
  console.log("[application] update use case depends on port, not adapter...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/UpdateKnowledgeDocumentUseCase.ts",
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

async function seedDocument(
  repository: KnowledgeDocumentRepository,
  workspaceId: string = WORKSPACE_A,
): Promise<void> {
  const sourceRepository: KnowledgeSourceRepository =
    new DefaultInMemoryKnowledgeSourceRepository();
  await sourceRepository.save({ workspaceId, id: SOURCE_1, name: "Docs Portal" });

  const create = new CreateKnowledgeDocumentUseCase(repository, sourceRepository);
  await create.execute({
    workspaceId,
    id: "doc-1",
    sourceId: SOURCE_1,
    title: "Original Title",
    text: "Original body",
  });
}

async function assertUpdatesTitleOnly(): Promise<void> {
  console.log("[application] update patches title only...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocument(repository);
  const update = new UpdateKnowledgeDocumentUseCase(repository);

  const input: UpdateKnowledgeDocumentInput = {
    workspaceId: WORKSPACE_A,
    id: " doc-1 ",
    title: " Updated Title ",
  };
  const result = await update.execute(input);

  assertEqual(result.id, "doc-1", "id mismatch");
  assertEqual(result.sourceId, SOURCE_1, "sourceId should be preserved");
  assertEqual(result.title, "Updated Title", "title should be trimmed/updated");
  assertEqual(result.text, "Original body", "text should be unchanged");

  const stored = await repository.findById(WORKSPACE_A, "doc-1");
  assertEqual(stored?.title, "Updated Title", "stored title mismatch");
  assertEqual(stored?.text, "Original body", "stored text mismatch");
}

async function assertUpdatesTextOnly(): Promise<void> {
  console.log("[application] update patches text only...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocument(repository);
  const update = new UpdateKnowledgeDocumentUseCase(repository);

  const result = await update.execute({
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    text: "Updated body",
  });

  assertEqual(result.title, "Original Title", "title should be unchanged");
  assertEqual(result.text, "Updated body", "text should be updated");
}

async function assertRejectsMissingDocument(): Promise<void> {
  console.log("[application] update rejects missing document...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const update = new UpdateKnowledgeDocumentUseCase(repository);

  await assertRejects(
    update.execute({
      workspaceId: WORKSPACE_A,
      id: "missing",
      title: "Nope",
    }),
    "not found",
  );
}

async function assertRejectsCrossWorkspaceUpdate(): Promise<void> {
  console.log("[application] update rejects document from a different workspace...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocument(repository, WORKSPACE_A);
  const update = new UpdateKnowledgeDocumentUseCase(repository);

  await assertRejects(
    update.execute({
      workspaceId: WORKSPACE_B,
      id: "doc-1",
      title: "Should not apply",
    }),
    "not found",
  );

  const stillOriginal = await repository.findById(WORKSPACE_A, "doc-1");
  assertEqual(stillOriginal?.title, "Original Title", "workspace A document must be untouched");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[application] update rejects invalid input...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocument(repository);
  const update = new UpdateKnowledgeDocumentUseCase(repository);

  await assertRejects(
    update.execute({ workspaceId: WORKSPACE_A, id: "doc-1" }),
    "at least one of title or text",
  );
  await assertRejects(
    update.execute({
      workspaceId: WORKSPACE_A,
      id: "doc-1",
      title: " ",
    }),
    "title must be a non-empty string",
  );
  await assertRejects(
    update.execute({
      workspaceId: " ",
      id: "doc-1",
      title: "Valid",
    }),
    "workspaceId must be a non-empty string",
  );
}

async function main(): Promise<void> {
  await assertDependsOnPortNotAdapter();
  await assertUpdatesTitleOnly();
  await assertUpdatesTextOnly();
  await assertRejectsMissingDocument();
  await assertRejectsCrossWorkspaceUpdate();
  await assertRejectsInvalidInput();
  console.log("UpdateKnowledgeDocumentUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
