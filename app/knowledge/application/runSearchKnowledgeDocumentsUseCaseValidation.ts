import { readFileSync } from "node:fs";
import path from "node:path";

import { CreateKnowledgeDocumentUseCase } from "./CreateKnowledgeDocumentUseCase";
import { SearchKnowledgeDocumentsUseCase } from "./SearchKnowledgeDocumentsUseCase";
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

async function seedDocuments(
  repository: KnowledgeDocumentRepository,
  workspaceId: string = WORKSPACE_A,
): Promise<void> {
  const create = new CreateKnowledgeDocumentUseCase(repository);
  await create.execute({
    workspaceId,
    id: "doc-1",
    title: "Architecture Guide",
    text: "Clean hexagonal boundaries for knowledge storage.",
  });
  await create.execute({
    workspaceId,
    id: "doc-2",
    title: "Search Patterns",
    text: "Filter documents by title or body text.",
  });
  await create.execute({
    workspaceId,
    id: "doc-3",
    title: "Operations Runbook",
    text: "Validate with pnpm and commit after review.",
  });
}

async function assertDependsOnPortNotAdapter(): Promise<void> {
  console.log("[application] search use case depends on port, not adapter...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/SearchKnowledgeDocumentsUseCase.ts",
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

async function assertSearchesTitleAndText(): Promise<void> {
  console.log("[application] search matches title and text by default...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocuments(repository);
  const search = new SearchKnowledgeDocumentsUseCase(repository);

  const byTitle = await search.execute({
    workspaceId: WORKSPACE_A,
    query: " architecture ",
  });
  assertEqual(byTitle.length, 1, "Expected one title match");
  assertEqual(byTitle[0]?.id, "doc-1", "Wrong title match");

  const byText = await search.execute({
    workspaceId: WORKSPACE_A,
    query: "FILTER",
  });
  assertEqual(byText.length, 1, "Expected one text match");
  assertEqual(byText[0]?.id, "doc-2", "Wrong text match");
}

async function assertFieldScopedSearch(): Promise<void> {
  console.log("[application] search respects field scope...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocuments(repository);
  const search = new SearchKnowledgeDocumentsUseCase(repository);

  const titleOnly = await search.execute({
    workspaceId: WORKSPACE_A,
    query: "filter",
    fields: ["title"],
  });
  assertEqual(titleOnly.length, 0, "Text-only hit must not match title field");

  const textOnly = await search.execute({
    workspaceId: WORKSPACE_A,
    query: "filter",
    fields: ["text"],
  });
  assertEqual(textOnly.length, 1, "Expected text-field match");
  assertEqual(textOnly[0]?.id, "doc-2", "Wrong text-field match");
}

async function assertNoMatchReturnsEmpty(): Promise<void> {
  console.log("[application] search returns empty when nothing matches...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocuments(repository);
  const search = new SearchKnowledgeDocumentsUseCase(repository);

  const result = await search.execute({
    workspaceId: WORKSPACE_A,
    query: "no-such-term-xyz",
  });
  assertEqual(result.length, 0, "Expected empty search result");
}

async function assertCrossWorkspaceIsolation(): Promise<void> {
  console.log("[application] search does not match documents from other workspaces...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocuments(repository, WORKSPACE_A);
  const search = new SearchKnowledgeDocumentsUseCase(repository);

  const result = await search.execute({
    workspaceId: WORKSPACE_B,
    query: "architecture",
  });
  assertEqual(result.length, 0, "Workspace B must not match workspace A documents");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[application] search rejects invalid input...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const search = new SearchKnowledgeDocumentsUseCase(repository);

  await assertRejects(
    search.execute({ workspaceId: WORKSPACE_A, query: " " }),
    "query must be a non-empty string",
  );
  await assertRejects(
    search.execute({ workspaceId: WORKSPACE_A, query: "ok", fields: [] }),
    "fields must be a non-empty array",
  );
  await assertRejects(
    search.execute({ workspaceId: " ", query: "ok" }),
    "workspaceId must be a non-empty string",
  );
}

async function main(): Promise<void> {
  await assertDependsOnPortNotAdapter();
  await assertSearchesTitleAndText();
  await assertFieldScopedSearch();
  await assertNoMatchReturnsEmpty();
  await assertCrossWorkspaceIsolation();
  await assertRejectsInvalidInput();
  console.log("SearchKnowledgeDocumentsUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
