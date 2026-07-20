import { InMemorySqlGateway } from "../infra/InMemorySqlGateway";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import { SqlDocumentChunkRepository } from "./SqlDocumentChunkRepository";

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

function buildRepository(): DocumentChunkRepository {
  return new SqlDocumentChunkRepository(new InMemorySqlGateway());
}

function chunk(
  overrides: Partial<DocumentChunk> & Pick<DocumentChunk, "id" | "documentId" | "order">,
): DocumentChunk {
  return {
    workspaceId: WORKSPACE_A,
    text: "chunk-text",
    ...overrides,
  };
}

async function assertReplaceAndOrder(): Promise<void> {
  console.log("[repository:sql-chunk] replace + order + findByDocumentId...");
  const repository = buildRepository();
  await repository.replaceForDocument(WORKSPACE_A, "doc-1", [
    chunk({ id: "c2", documentId: "doc-1", order: 1, text: "second" }),
    chunk({ id: "c1", documentId: "doc-1", order: 0, text: "first" }),
  ]);
  const found = await repository.findByDocumentId(WORKSPACE_A, "doc-1");
  assertEqual(found.length, 2, "length");
  assertEqual(found[0]!.id, "c1", "order first");
  assertEqual(found[1]!.id, "c2", "order second");
}

async function assertClearAndIsolation(): Promise<void> {
  console.log("[repository:sql-chunk] clear + workspace/document isolation...");
  const repository = buildRepository();
  await repository.replaceForDocument(WORKSPACE_A, "doc-1", [
    chunk({ id: "a1", documentId: "doc-1", order: 0 }),
  ]);
  await repository.replaceForDocument(WORKSPACE_A, "doc-2", [
    chunk({ id: "b1", documentId: "doc-2", order: 0 }),
  ]);
  await repository.replaceForDocument(WORKSPACE_B, "doc-1", [
    chunk({
      workspaceId: WORKSPACE_B,
      id: "a1",
      documentId: "doc-1",
      order: 0,
      text: "b-chunk",
    }),
  ]);
  await repository.replaceForDocument(WORKSPACE_A, "doc-1", []);
  assertEqual(
    (await repository.findByDocumentId(WORKSPACE_A, "doc-1")).length,
    0,
    "cleared",
  );
  assertEqual(
    (await repository.findByDocumentId(WORKSPACE_A, "doc-2")).length,
    1,
    "other doc",
  );
  assertEqual(
    (await repository.findById(WORKSPACE_B, "a1"))?.text,
    "b-chunk",
    "workspace B",
  );
}

async function assertGlobalIdConflict(): Promise<void> {
  console.log(
    "[repository:sql-chunk] workspace-global id conflict rejection without partial write...",
  );
  const repository = buildRepository();
  await repository.replaceForDocument(WORKSPACE_A, "doc-1", [
    chunk({ id: "shared", documentId: "doc-1", order: 0, text: "keep" }),
  ]);
  await assertRejects(
    repository.replaceForDocument(WORKSPACE_A, "doc-2", [
      chunk({ id: "shared", documentId: "doc-2", order: 0, text: "steal" }),
    ]),
    "already owned by a different document",
  );
  assertEqual(
    (await repository.findById(WORKSPACE_A, "shared"))?.documentId,
    "doc-1",
    "owner unchanged",
  );
  assertEqual(
    (await repository.findByDocumentId(WORKSPACE_A, "doc-2")).length,
    0,
    "no partial write",
  );
}

async function assertReuseOwnIdsAndFindAll(): Promise<void> {
  console.log("[repository:sql-chunk] reuse own ids + findAll ordering...");
  const repository = buildRepository();
  await repository.replaceForDocument(WORKSPACE_A, "doc-1", [
    chunk({ id: "c1", documentId: "doc-1", order: 0 }),
  ]);
  await repository.replaceForDocument(WORKSPACE_A, "doc-1", [
    chunk({ id: "c1", documentId: "doc-1", order: 0, text: "rewritten" }),
  ]);
  assertEqual(
    (await repository.findById(WORKSPACE_A, "c1"))?.text,
    "rewritten",
    "reuse",
  );
  await repository.replaceForDocument(WORKSPACE_A, "doc-2", [
    chunk({ id: "c2", documentId: "doc-2", order: 0 }),
  ]);
  const all = await repository.findAll(WORKSPACE_A);
  assertEqual(all.map((c) => c.id).join(","), "c1,c2", "findAll order");
}

async function assertDefensiveCopy(): Promise<void> {
  console.log("[repository:sql-chunk] defensive copy...");
  const repository = buildRepository();
  const input = [chunk({ id: "d1", documentId: "doc-1", order: 0, text: "orig" })];
  await repository.replaceForDocument(WORKSPACE_A, "doc-1", input);
  input[0]!.text = "mutated";
  const found = await repository.findByDocumentId(WORKSPACE_A, "doc-1");
  assertEqual(found[0]!.text, "orig", "input");
  found[0]!.text = "out";
  assertEqual(
    (await repository.findByDocumentId(WORKSPACE_A, "doc-1"))[0]!.text,
    "orig",
    "output",
  );
}

async function main(): Promise<void> {
  await assertReplaceAndOrder();
  await assertClearAndIsolation();
  await assertGlobalIdConflict();
  await assertReuseOwnIdsAndFindAll();
  await assertDefensiveCopy();
  console.log("SqlDocumentChunkRepository validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
