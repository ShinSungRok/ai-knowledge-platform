import { readFileSync } from "node:fs";
import path from "node:path";

import { ListKnowledgeDocumentsUseCase } from "./ListKnowledgeDocumentsUseCase";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
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

async function seedRepository(
  repository: KnowledgeDocumentRepository,
): Promise<KnowledgeDocument[]> {
  const documents: KnowledgeDocument[] = [
    {
      workspaceId: WORKSPACE_A,
      id: "doc-1",
      title: "Architecture Overview",
      text: "Clean / Hexagonal boundaries for knowledge storage.",
    },
    {
      workspaceId: WORKSPACE_A,
      id: "doc-2",
      title: "Query Use Case",
      text: "List knowledge documents through the repository port.",
    },
  ];

  for (const document of documents) {
    await repository.save(document);
  }

  return documents;
}

async function assertEmptyList(): Promise<void> {
  console.log("[application] empty repository returns empty list...");
  const repository = new DefaultInMemoryRepository();
  const useCase = new ListKnowledgeDocumentsUseCase(repository);
  const result = await useCase.execute({ workspaceId: WORKSPACE_A });
  assertEqual(result.length, 0, "Expected empty list");
}

async function assertListsSeededDocuments(): Promise<void> {
  console.log("[application] lists seeded knowledge documents...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const seeded = await seedRepository(repository);
  const useCase = new ListKnowledgeDocumentsUseCase(repository);

  const result = await useCase.execute({ workspaceId: WORKSPACE_A });
  assertEqual(result.length, seeded.length, "Expected seeded document count");

  const byId = new Map(result.map((document) => [document.id, document]));
  for (const expected of seeded) {
    const actual = byId.get(expected.id);
    assertTruthy(actual, `Missing document ${expected.id}`);
    assertEqual(actual?.title, expected.title, `title mismatch for ${expected.id}`);
    assertEqual(actual?.text, expected.text, `text mismatch for ${expected.id}`);
  }
}

async function assertCrossWorkspaceIsolation(): Promise<void> {
  console.log("[application] list is scoped to workspaceId...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedRepository(repository);
  const useCase = new ListKnowledgeDocumentsUseCase(repository);

  const otherWorkspace = await useCase.execute({ workspaceId: WORKSPACE_B });
  assertEqual(otherWorkspace.length, 0, "Other workspace must not see documents");
}

async function assertDependsOnPortNotAdapter(): Promise<void> {
  console.log("[application] use case source depends on port, not adapter...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/ListKnowledgeDocumentsUseCase.ts",
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

async function assertPortInjection(): Promise<void> {
  console.log("[application] accepts any KnowledgeDocumentRepository...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await repository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-x",
    title: "Injected",
    text: "Wired via port type",
  });

  const useCase = new ListKnowledgeDocumentsUseCase(repository);
  const result = await useCase.execute({ workspaceId: WORKSPACE_A });
  assertEqual(result.length, 1, "Expected one document via port injection");
  assertEqual(result[0]?.id, "doc-x", "id mismatch via port injection");
}

async function assertRejectsMissingWorkspaceId(): Promise<void> {
  console.log("[application] rejects missing workspaceId...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const useCase = new ListKnowledgeDocumentsUseCase(repository);

  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute({}),
    "workspaceId must be a non-empty string",
  );
}

async function main(): Promise<void> {
  await assertDependsOnPortNotAdapter();
  await assertEmptyList();
  await assertListsSeededDocuments();
  await assertCrossWorkspaceIsolation();
  await assertPortInjection();
  await assertRejectsMissingWorkspaceId();
  console.log("ListKnowledgeDocumentsUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
