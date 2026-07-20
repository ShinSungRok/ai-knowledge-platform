import { readFileSync } from "node:fs";
import path from "node:path";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import { DefaultKnowledgeSourceChangeDetector } from "./DefaultKnowledgeSourceChangeDetector";
import type { KnowledgeSourceChangeDetector } from "./KnowledgeSourceChangeDetector";
import type { ConnectorDocument } from "./KnowledgeSourceConnector";
import type { SyncChangeSet } from "./SyncChangeSet";
import type { SyncDocumentChange } from "./SyncDocumentChange";

const SOURCE_A = "source-a";
const WORKSPACE_A = "workspace-a";

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

function assertThrows(fn: () => unknown, messageIncludes: string): void {
  try {
    fn();
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageIncludes),
      `expected error to include "${messageIncludes}", got "${text}"`,
    );
    return;
  }
  throw new Error(`expected throw including "${messageIncludes}"`);
}

function canonicalId(sourceId: string, externalId: string): string {
  return `${encodeURIComponent(sourceId)}:${encodeURIComponent(externalId)}`;
}

function doc(
  overrides: Partial<KnowledgeDocument> & Pick<KnowledgeDocument, "id">,
): KnowledgeDocument {
  return {
    workspaceId: WORKSPACE_A,
    sourceId: SOURCE_A,
    title: "Title",
    text: "Body",
    ...overrides,
  };
}

function fetched(
  externalId: string,
  title = "Title",
  text = "Body",
): ConnectorDocument {
  return { externalId, title, text };
}

function kinds(changeSet: SyncChangeSet): SyncChangeKindList {
  return changeSet.changes.map((c) => c.kind);
}

type SyncChangeKindList = SyncDocumentChange["kind"][];

function assertPortContract(): void {
  console.log("[pipeline] port contract (KnowledgeSourceChangeDetector)...");
  const detector: KnowledgeSourceChangeDetector =
    new DefaultKnowledgeSourceChangeDetector();
  assertTruthy(typeof detector.detect === "function", "detect must be defined");
}

function assertClassifiesAddedUpdatedUnchangedRemoved(): void {
  console.log(
    "[pipeline] detect classifies added/updated/unchanged/removed deterministically...",
  );
  const detector = new DefaultKnowledgeSourceChangeDetector();
  const existing = [
    doc({ id: canonicalId(SOURCE_A, "keep"), title: "Same", text: "Same" }),
    doc({ id: canonicalId(SOURCE_A, "change"), title: "Old", text: "Old" }),
    doc({ id: canonicalId(SOURCE_A, "gone"), title: "Gone", text: "Gone" }),
  ];
  const changeSet = detector.detect({
    sourceId: SOURCE_A,
    fetched: [
      fetched("new", "New", "New"),
      fetched("keep", "Same", "Same"),
      fetched("change", "NewTitle", "Old"),
    ],
    existing,
  });

  assertEqual(changeSet.sourceId, SOURCE_A, "expected sourceId");
  assertEqual(
    JSON.stringify(kinds(changeSet)),
    JSON.stringify(["added", "updated", "unchanged", "removed"]),
    "expected kind order",
  );
  assertEqual(changeSet.changes[0]?.externalId, "new", "added externalId");
  assertEqual(
    changeSet.changes[0]?.documentId,
    canonicalId(SOURCE_A, "new"),
    "added documentId",
  );
  assertEqual(changeSet.changes[1]?.externalId, "change", "updated externalId");
  assertEqual(changeSet.changes[2]?.externalId, "keep", "unchanged externalId");
  assertEqual(changeSet.changes[3]?.externalId, "gone", "removed externalId");
}

function assertIgnoresOtherSourceExistingDocuments(): void {
  console.log(
    "[pipeline] detect ignores existing documents from a different sourceId...",
  );
  const detector = new DefaultKnowledgeSourceChangeDetector();
  const changeSet = detector.detect({
    sourceId: SOURCE_A,
    fetched: [fetched("a")],
    existing: [
      doc({
        id: canonicalId("other", "a"),
        sourceId: "other",
        title: "Other",
        text: "Other",
      }),
      doc({ id: canonicalId(SOURCE_A, "a"), title: "Title", text: "Body" }),
    ],
  });
  assertEqual(changeSet.changes.length, 1, "expected one change");
  assertEqual(changeSet.changes[0]?.kind, "unchanged", "expected unchanged");
}

function assertOrdersByKindThenDocumentId(): void {
  console.log(
    "[pipeline] detect orders changes by kind then documentId ascending...",
  );
  const detector = new DefaultKnowledgeSourceChangeDetector();
  const changeSet = detector.detect({
    sourceId: SOURCE_A,
    fetched: [
      fetched("z-new"),
      fetched("a-new"),
      fetched("z-upd", "New", "Body"),
      fetched("a-upd", "New", "Body"),
      fetched("z-same"),
      fetched("a-same"),
    ],
    existing: [
      doc({ id: canonicalId(SOURCE_A, "z-upd"), title: "Old", text: "Body" }),
      doc({ id: canonicalId(SOURCE_A, "a-upd"), title: "Old", text: "Body" }),
      doc({ id: canonicalId(SOURCE_A, "z-same") }),
      doc({ id: canonicalId(SOURCE_A, "a-same") }),
      doc({ id: canonicalId(SOURCE_A, "z-gone") }),
      doc({ id: canonicalId(SOURCE_A, "a-gone") }),
    ],
  });

  const documentIds = changeSet.changes.map((c) => c.documentId);
  assertEqual(
    JSON.stringify(documentIds),
    JSON.stringify([
      canonicalId(SOURCE_A, "a-new"),
      canonicalId(SOURCE_A, "z-new"),
      canonicalId(SOURCE_A, "a-upd"),
      canonicalId(SOURCE_A, "z-upd"),
      canonicalId(SOURCE_A, "a-same"),
      canonicalId(SOURCE_A, "z-same"),
      canonicalId(SOURCE_A, "a-gone"),
      canonicalId(SOURCE_A, "z-gone"),
    ]),
    "expected deterministic documentId order within kinds",
  );
}

function assertIsDeterministicAcrossRepeatedCalls(): void {
  console.log(
    "[pipeline] detect is deterministic across repeated calls on the same input...",
  );
  const detector = new DefaultKnowledgeSourceChangeDetector();
  const input = {
    sourceId: SOURCE_A,
    fetched: [fetched("b"), fetched("a", "T2", "X")],
    existing: [
      doc({ id: canonicalId(SOURCE_A, "a"), title: "T1", text: "X" }),
      doc({ id: canonicalId(SOURCE_A, "c") }),
    ],
  };
  const first = detector.detect(input);
  const second = detector.detect(input);
  assertEqual(
    JSON.stringify(first),
    JSON.stringify(second),
    "expected identical change sets",
  );
}

function assertUsesSameCanonicalIdFormulaAsSyncPipeline(): void {
  console.log(
    "[pipeline] detect uses SyncKnowledgeSourcePipeline canonical id formula...",
  );
  const detector = new DefaultKnowledgeSourceChangeDetector();
  const sourceId = "src:space";
  const externalId = "ext/id";
  const changeSet = detector.detect({
    sourceId,
    fetched: [fetched(externalId)],
    existing: [],
  });
  assertEqual(
    changeSet.changes[0]?.documentId,
    `${encodeURIComponent(sourceId)}:${encodeURIComponent(externalId)}`,
    "expected encodeURIComponent canonical id",
  );
}

function assertRejectsDuplicateExternalId(): void {
  console.log(
    "[pipeline] detect rejects duplicate externalId within fetched batch...",
  );
  const detector = new DefaultKnowledgeSourceChangeDetector();
  assertThrows(
    () =>
      detector.detect({
        sourceId: SOURCE_A,
        fetched: [fetched("dup"), fetched("dup")],
        existing: [],
      }),
    "Duplicate externalId within sync batch",
  );
}

function assertRejectsInvalidInput(): void {
  console.log("[pipeline] detect rejects invalid input...");
  const detector = new DefaultKnowledgeSourceChangeDetector();
  assertThrows(
    () =>
      detector.detect({
        sourceId: "  ",
        fetched: [],
        existing: [],
      }),
    "sourceId must be a non-empty string",
  );
  assertThrows(
    () =>
      detector.detect({
        sourceId: SOURCE_A,
        // @ts-expect-error intentional
        fetched: null,
        existing: [],
      }),
    "fetched must be an array",
  );
  assertThrows(
    () =>
      detector.detect({
        sourceId: SOURCE_A,
        fetched: [{ externalId: "", title: "T", text: "B" }],
        existing: [],
      }),
    "externalId must be a non-empty string",
  );
  assertThrows(
    () =>
      detector.detect({
        sourceId: SOURCE_A,
        fetched: [],
        existing: [
          // @ts-expect-error intentional
          { id: "x", sourceId: SOURCE_A, title: "T", text: 1 },
        ],
      }),
    "text must be a string",
  );
}

function assertImportsNoAdapters(): void {
  console.log(
    "[pipeline] DefaultKnowledgeSourceChangeDetector has no constructor deps and imports no adapters...",
  );
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/pipeline/DefaultKnowledgeSourceChangeDetector.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbidden = [
    "KnowledgeDocumentRepository",
    "KnowledgeSourceRepository",
    "DocumentChunkRepository",
    "VectorIndex",
    "FakeKnowledgeSourceConnector",
    "InMemoryVectorIndex",
    "../persistence",
    "../repository",
    "../embedding",
  ];
  for (const reference of forbidden) {
    assertTruthy(
      !source.includes(reference),
      `must not reference "${reference}"`,
    );
  }
  assertTruthy(
    !source.includes("constructor("),
    "expected no constructor dependencies",
  );
}

async function main(): Promise<void> {
  assertPortContract();
  assertClassifiesAddedUpdatedUnchangedRemoved();
  assertIgnoresOtherSourceExistingDocuments();
  assertOrdersByKindThenDocumentId();
  assertIsDeterministicAcrossRepeatedCalls();
  assertUsesSameCanonicalIdFormulaAsSyncPipeline();
  assertRejectsDuplicateExternalId();
  assertRejectsInvalidInput();
  assertImportsNoAdapters();
  console.log("DefaultKnowledgeSourceChangeDetector validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
