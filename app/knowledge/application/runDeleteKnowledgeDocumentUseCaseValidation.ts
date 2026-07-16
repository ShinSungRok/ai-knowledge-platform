import { readFileSync } from "node:fs";
import path from "node:path";

import { CreateKnowledgeDocumentUseCase } from "./CreateKnowledgeDocumentUseCase";
import { ListKnowledgeDocumentsUseCase } from "./ListKnowledgeDocumentsUseCase";
import {
  DeleteKnowledgeDocumentUseCase,
  type DeleteKnowledgeDocumentInput,
} from "./DeleteKnowledgeDocumentUseCase";
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
  console.log("[application] delete use case depends on port, not adapter...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/DeleteKnowledgeDocumentUseCase.ts",
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

async function assertDeletesExistingDocument(): Promise<void> {
  console.log("[application] delete removes existing knowledge document...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const create = new CreateKnowledgeDocumentUseCase(repository);
  const list = new ListKnowledgeDocumentsUseCase(repository);
  const remove = new DeleteKnowledgeDocumentUseCase(repository);

  await create.execute({
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    title: "To Delete",
    text: "Will be removed",
  });
  await create.execute({
    workspaceId: WORKSPACE_A,
    id: "doc-2",
    title: "Keep",
    text: "Should remain",
  });

  const input: DeleteKnowledgeDocumentInput = {
    workspaceId: WORKSPACE_A,
    id: " doc-1 ",
  };
  const deleted = await remove.execute(input);

  assertEqual(deleted.id, "doc-1", "deleted id mismatch");
  assertEqual(deleted.title, "To Delete", "deleted title mismatch");

  const missing = await repository.findById(WORKSPACE_A, "doc-1");
  assertEqual(missing, null, "Expected deleted document to be gone");

  const remaining = await list.execute({ workspaceId: WORKSPACE_A });
  assertEqual(remaining.length, 1, "Expected one remaining document");
  assertEqual(remaining[0]?.id, "doc-2", "Wrong document remained");
}

async function assertRejectsMissingDocument(): Promise<void> {
  console.log("[application] delete rejects missing document...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const remove = new DeleteKnowledgeDocumentUseCase(repository);

  await assertRejects(
    remove.execute({ workspaceId: WORKSPACE_A, id: "missing" }),
    "not found",
  );
}

async function assertRejectsCrossWorkspaceDelete(): Promise<void> {
  console.log("[application] delete rejects document from a different workspace...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const create = new CreateKnowledgeDocumentUseCase(repository);
  const remove = new DeleteKnowledgeDocumentUseCase(repository);

  await create.execute({
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    title: "Protected",
    text: "body",
  });

  await assertRejects(
    remove.execute({ workspaceId: WORKSPACE_B, id: "doc-1" }),
    "not found",
  );

  const stillThere = await repository.findById(WORKSPACE_A, "doc-1");
  assertTruthy(stillThere, "workspace A document must survive a cross-workspace delete attempt");
}

async function assertRejectsInvalidId(): Promise<void> {
  console.log("[application] delete rejects invalid id...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const remove = new DeleteKnowledgeDocumentUseCase(repository);

  await assertRejects(
    remove.execute({ workspaceId: WORKSPACE_A, id: " " }),
    "id must be a non-empty string",
  );
  await assertRejects(
    remove.execute({ workspaceId: " ", id: "doc-1" }),
    "workspaceId must be a non-empty string",
  );
}

async function main(): Promise<void> {
  await assertDependsOnPortNotAdapter();
  await assertDeletesExistingDocument();
  await assertRejectsMissingDocument();
  await assertRejectsCrossWorkspaceDelete();
  await assertRejectsInvalidId();
  console.log("DeleteKnowledgeDocumentUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
