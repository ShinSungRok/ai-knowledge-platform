import { readFileSync } from "node:fs";
import path from "node:path";

import { CreateKnowledgeDocumentUseCase } from "./CreateKnowledgeDocumentUseCase";
import { ListKnowledgeDocumentsPageUseCase } from "./ListKnowledgeDocumentsPageUseCase";
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

async function seedDocuments(
  repository: KnowledgeDocumentRepository,
): Promise<void> {
  const create = new CreateKnowledgeDocumentUseCase(repository);
  await create.execute({ id: "doc-3", title: "Charlie", text: "third" });
  await create.execute({ id: "doc-1", title: "Alpha", text: "first" });
  await create.execute({ id: "doc-2", title: "Bravo", text: "second" });
}

async function assertDependsOnPortNotAdapter(): Promise<void> {
  console.log("[application] page use case depends on port, not adapter...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/ListKnowledgeDocumentsPageUseCase.ts",
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

async function assertDefaultsToSortedByIdAscending(): Promise<void> {
  console.log("[application] defaults to id ascending, page 1...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocuments(repository);
  const useCase = new ListKnowledgeDocumentsPageUseCase(repository);

  const result = await useCase.execute();
  assertEqual(result.page, 1, "default page mismatch");
  assertEqual(result.pageSize, 20, "default pageSize mismatch");
  assertEqual(result.totalCount, 3, "totalCount mismatch");
  assertEqual(result.totalPages, 1, "totalPages mismatch");
  assertEqual(result.items.length, 3, "items length mismatch");
  assertEqual(result.items[0]?.id, "doc-1", "sort order mismatch (0)");
  assertEqual(result.items[1]?.id, "doc-2", "sort order mismatch (1)");
  assertEqual(result.items[2]?.id, "doc-3", "sort order mismatch (2)");
}

async function assertSortsByTitleDescending(): Promise<void> {
  console.log("[application] sorts by title descending...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocuments(repository);
  const useCase = new ListKnowledgeDocumentsPageUseCase(repository);

  const result = await useCase.execute({
    sortBy: "title",
    sortOrder: "desc",
  });
  assertEqual(result.items[0]?.title, "Charlie", "desc sort mismatch (0)");
  assertEqual(result.items[1]?.title, "Bravo", "desc sort mismatch (1)");
  assertEqual(result.items[2]?.title, "Alpha", "desc sort mismatch (2)");
}

async function assertPaginatesResults(): Promise<void> {
  console.log("[application] paginates with pageSize...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocuments(repository);
  const useCase = new ListKnowledgeDocumentsPageUseCase(repository);

  const pageOne = await useCase.execute({ page: 1, pageSize: 2 });
  assertEqual(pageOne.items.length, 2, "page 1 items length mismatch");
  assertEqual(pageOne.totalPages, 2, "totalPages mismatch");
  assertEqual(pageOne.items[0]?.id, "doc-1", "page 1 item 0 mismatch");
  assertEqual(pageOne.items[1]?.id, "doc-2", "page 1 item 1 mismatch");

  const pageTwo = await useCase.execute({ page: 2, pageSize: 2 });
  assertEqual(pageTwo.items.length, 1, "page 2 items length mismatch");
  assertEqual(pageTwo.items[0]?.id, "doc-3", "page 2 item 0 mismatch");
}

async function assertOutOfRangePageReturnsEmpty(): Promise<void> {
  console.log("[application] out-of-range page returns empty items...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocuments(repository);
  const useCase = new ListKnowledgeDocumentsPageUseCase(repository);

  const result = await useCase.execute({ page: 5, pageSize: 2 });
  assertEqual(result.items.length, 0, "Expected empty items for out-of-range page");
  assertEqual(result.totalCount, 3, "totalCount should still reflect all documents");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[application] rejects invalid page/pageSize/sortBy/sortOrder...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const useCase = new ListKnowledgeDocumentsPageUseCase(repository);

  await assertRejects(
    useCase.execute({ page: 0 }),
    "page must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ pageSize: 0 }),
    "pageSize must be an integer between 1 and 100",
  );
  await assertRejects(
    useCase.execute({ pageSize: 101 }),
    "pageSize must be an integer between 1 and 100",
  );
  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute({ sortBy: "text" }),
    'sortBy must be one of "id" or "title"',
  );
  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute({ sortOrder: "up" }),
    'sortOrder must be one of "asc" or "desc"',
  );
}

async function main(): Promise<void> {
  await assertDependsOnPortNotAdapter();
  await assertDefaultsToSortedByIdAscending();
  await assertSortsByTitleDescending();
  await assertPaginatesResults();
  await assertOutOfRangePageReturnsEmpty();
  await assertRejectsInvalidInput();
  console.log("ListKnowledgeDocumentsPageUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
