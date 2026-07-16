import { readFileSync } from "node:fs";
import path from "node:path";

import { CreateKnowledgeDocumentUseCase } from "./CreateKnowledgeDocumentUseCase";
import { ExportKnowledgeDocumentsUseCase } from "./ExportKnowledgeDocumentsUseCase";
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
    text: "Clean hexagonal boundaries.",
  });
  await create.execute({
    workspaceId,
    id: "doc-2",
    title: 'Quoted, "Title"',
    text: "Line one\nLine two, with comma",
  });
}

async function assertDependsOnPortNotAdapter(): Promise<void> {
  console.log("[application] export use case depends on port, not adapter...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/ExportKnowledgeDocumentsUseCase.ts",
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

async function assertDefaultsToJson(): Promise<void> {
  console.log("[application] export defaults to json format...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocuments(repository);
  const useCase = new ExportKnowledgeDocumentsUseCase(repository);

  const result = await useCase.execute({ workspaceId: WORKSPACE_A });
  assertEqual(result.format, "json", "default format mismatch");
  assertEqual(result.count, 2, "count mismatch");

  const parsed = JSON.parse(result.content) as unknown[];
  assertEqual(parsed.length, 2, "parsed json length mismatch");
  assertTruthy(
    result.content.includes('"id": "doc-1"'),
    "Expected pretty-printed json to include doc-1",
  );
}

async function assertExportsEmptyJsonArray(): Promise<void> {
  console.log("[application] export handles empty repository (json)...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const useCase = new ExportKnowledgeDocumentsUseCase(repository);

  const result = await useCase.execute({ workspaceId: WORKSPACE_A, format: "json" });
  assertEqual(result.count, 0, "expected zero count");
  assertEqual(JSON.parse(result.content).length, 0, "expected empty array");
}

async function assertExportsCsvWithHeader(): Promise<void> {
  console.log("[application] export produces csv with header row...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocuments(repository);
  const useCase = new ExportKnowledgeDocumentsUseCase(repository);

  const result = await useCase.execute({ workspaceId: WORKSPACE_A, format: "csv" });
  const lines = result.content.split("\n");
  assertEqual(lines[0], "id,title,text", "csv header mismatch");
  assertTruthy(
    result.content.includes("doc-1,Architecture Guide,Clean hexagonal boundaries."),
    "Expected plain csv row for doc-1",
  );
}

async function assertEscapesCsvSpecialCharacters(): Promise<void> {
  console.log("[application] export escapes csv commas/quotes/newlines...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocuments(repository);
  const useCase = new ExportKnowledgeDocumentsUseCase(repository);

  const result = await useCase.execute({ workspaceId: WORKSPACE_A, format: "csv" });
  assertTruthy(
    result.content.includes('doc-2,"Quoted, ""Title""","Line one\nLine two, with comma"'),
    "Expected escaped csv row for doc-2",
  );
}

async function assertScopedToWorkspace(): Promise<void> {
  console.log("[application] export only includes documents from the requested workspace...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  await seedDocuments(repository, WORKSPACE_A);
  const useCase = new ExportKnowledgeDocumentsUseCase(repository);

  const result = await useCase.execute({ workspaceId: WORKSPACE_B });
  assertEqual(result.count, 0, "Workspace B export must be empty");
  assertEqual(JSON.parse(result.content).length, 0, "Workspace B export json must be empty array");
}

async function assertRejectsInvalidFormat(): Promise<void> {
  console.log("[application] export rejects invalid format...");
  const repository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const useCase = new ExportKnowledgeDocumentsUseCase(repository);

  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute({ workspaceId: WORKSPACE_A, format: "xml" }),
    'format must be one of "json" or "csv"',
  );
  await assertRejects(
    useCase.execute({ workspaceId: " " }),
    "workspaceId must be a non-empty string",
  );
}

async function main(): Promise<void> {
  await assertDependsOnPortNotAdapter();
  await assertDefaultsToJson();
  await assertExportsEmptyJsonArray();
  await assertExportsCsvWithHeader();
  await assertEscapesCsvSpecialCharacters();
  await assertScopedToWorkspace();
  await assertRejectsInvalidFormat();
  console.log("ExportKnowledgeDocumentsUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
