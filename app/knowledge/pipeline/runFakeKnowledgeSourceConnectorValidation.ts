import {
  FakeKnowledgeSourceConnector,
  type FakeKnowledgeSourceFixture,
} from "./FakeKnowledgeSourceConnector";
import type {
  ConnectorDocument,
  KnowledgeSourceConnector,
} from "./KnowledgeSourceConnector";
import type { KnowledgeSource } from "../domain/KnowledgeSource";

const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";
const SOURCE_1 = "source-1";
const SOURCE_2 = "source-2";

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

function assertThrowsSync(fn: () => unknown, messageSubstring: string): void {
  try {
    fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected error message to include "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected synchronous throw containing: ${messageSubstring}`);
}

function sourceRef(workspaceId: string, id: string): KnowledgeSource {
  return { workspaceId, id, name: "Fixture Source" };
}

async function assertPortContract(): Promise<void> {
  console.log("[pipeline] port contract (KnowledgeSourceConnector)...");
  const connector: KnowledgeSourceConnector = new FakeKnowledgeSourceConnector();
  assertTruthy(
    typeof connector.fetchDocuments === "function",
    "fetchDocuments must be defined",
  );
}

async function assertReturnsScopedFixtureDocuments(): Promise<void> {
  console.log("[pipeline] fetchDocuments returns fixtures scoped to workspace + source...");
  const fixtures: FakeKnowledgeSourceFixture[] = [
    {
      workspaceId: WORKSPACE_A,
      sourceId: SOURCE_1,
      documents: [
        { externalId: "ext-1", title: "Doc One", text: "First body" },
        { externalId: "ext-2", title: "Doc Two", text: "Second body" },
      ],
    },
    {
      workspaceId: WORKSPACE_A,
      sourceId: SOURCE_2,
      documents: [{ externalId: "ext-3", title: "Other Source Doc", text: "body" }],
    },
    {
      workspaceId: WORKSPACE_B,
      sourceId: SOURCE_1,
      documents: [{ externalId: "ext-4", title: "Workspace B Doc", text: "body" }],
    },
  ];
  const connector: KnowledgeSourceConnector = new FakeKnowledgeSourceConnector(fixtures);

  const resultA1 = await connector.fetchDocuments(sourceRef(WORKSPACE_A, SOURCE_1));
  assertEqual(resultA1.length, 2, "expected two documents for workspace A / source 1");
  assertEqual(resultA1[0]?.externalId, "ext-1", "externalId mismatch (0)");
  assertEqual(resultA1[1]?.externalId, "ext-2", "externalId mismatch (1)");

  const resultA2 = await connector.fetchDocuments(sourceRef(WORKSPACE_A, SOURCE_2));
  assertEqual(resultA2.length, 1, "expected one document for workspace A / source 2");
  assertEqual(resultA2[0]?.externalId, "ext-3", "externalId mismatch for source 2");

  const resultB1 = await connector.fetchDocuments(sourceRef(WORKSPACE_B, SOURCE_1));
  assertEqual(resultB1.length, 1, "expected one document for workspace B / source 1");
  assertEqual(resultB1[0]?.externalId, "ext-4", "externalId mismatch for workspace B");
}

async function assertUnregisteredSourceReturnsEmpty(): Promise<void> {
  console.log("[pipeline] fetchDocuments returns empty array for an unregistered source...");
  const connector: KnowledgeSourceConnector = new FakeKnowledgeSourceConnector([
    {
      workspaceId: WORKSPACE_A,
      sourceId: SOURCE_1,
      documents: [{ externalId: "ext-1", title: "Doc", text: "body" }],
    },
  ]);

  const result = await connector.fetchDocuments(sourceRef(WORKSPACE_A, "unregistered-source"));
  assertEqual(result.length, 0, "expected empty array for a source with no fixture");

  const crossWorkspace = await connector.fetchDocuments(sourceRef(WORKSPACE_B, SOURCE_1));
  assertEqual(
    crossWorkspace.length,
    0,
    "expected empty array for a source id only registered in a different workspace",
  );
}

async function assertDefensiveCopy(): Promise<void> {
  console.log("[pipeline] defensive copy on fixture input and returned output...");
  const documents: ConnectorDocument[] = [
    { externalId: "ext-1", title: "Original", text: "original body" },
  ];
  const connector: KnowledgeSourceConnector = new FakeKnowledgeSourceConnector([
    { workspaceId: WORKSPACE_A, sourceId: SOURCE_1, documents },
  ]);

  const firstDocument = documents[0];
  if (!firstDocument) {
    throw new Error("Expected a fixture document at index 0");
  }
  firstDocument.title = "mutated-input";
  documents.push({ externalId: "ext-2", title: "Injected", text: "must not appear" });

  const first = await connector.fetchDocuments(sourceRef(WORKSPACE_A, SOURCE_1));
  assertEqual(first.length, 1, "stored fixture must not grow from a mutated input array");
  assertEqual(first[0]?.title, "Original", "stored fixture must not reflect a mutated input object");

  const firstResult = first[0];
  if (!firstResult) {
    throw new Error("Expected a fetched document at index 0");
  }
  firstResult.title = "mutated-output";
  first.push({ externalId: "ext-3", title: "Injected", text: "must not appear" });

  const second = await connector.fetchDocuments(sourceRef(WORKSPACE_A, SOURCE_1));
  assertEqual(second.length, 1, "stored fixture must not reflect a mutated output array");
  assertEqual(second[0]?.title, "Original", "stored fixture must not reflect a mutated output object");
}

async function assertRejectsInvalidSourceIdentifiers(): Promise<void> {
  console.log("[pipeline] fetchDocuments rejects invalid source identifiers...");
  const connector: KnowledgeSourceConnector = new FakeKnowledgeSourceConnector();

  await assertRejects(
    connector.fetchDocuments(sourceRef(" ", SOURCE_1)),
    "workspaceId must be a non-empty string",
  );
  await assertRejects(
    connector.fetchDocuments(sourceRef(WORKSPACE_A, " ")),
    "id must be a non-empty string",
  );
}

async function assertRejectsInvalidFixtures(): Promise<void> {
  console.log("[pipeline] constructor rejects invalid fixture values...");

  assertThrowsSync(
    () => new FakeKnowledgeSourceConnector([{ workspaceId: " ", sourceId: SOURCE_1, documents: [] }]),
    "workspaceId must be a non-empty string",
  );
  assertThrowsSync(
    () => new FakeKnowledgeSourceConnector([{ workspaceId: WORKSPACE_A, sourceId: " ", documents: [] }]),
    "sourceId must be a non-empty string",
  );
  assertThrowsSync(
    () =>
      new FakeKnowledgeSourceConnector([
        {
          workspaceId: WORKSPACE_A,
          sourceId: SOURCE_1,
          documents: [{ externalId: " ", title: "Valid", text: "body" }],
        },
      ]),
    "externalId must be a non-empty string",
  );
  assertThrowsSync(
    () =>
      new FakeKnowledgeSourceConnector([
        {
          workspaceId: WORKSPACE_A,
          sourceId: SOURCE_1,
          documents: [{ externalId: "ext-1", title: "", text: "body" }],
        },
      ]),
    "title must be a non-empty string",
  );
  assertThrowsSync(
    () =>
      new FakeKnowledgeSourceConnector([
        {
          workspaceId: WORKSPACE_A,
          sourceId: SOURCE_1,
          // @ts-expect-error intentionally invalid for validation coverage
          documents: [{ externalId: "ext-1", title: "Valid", text: 123 }],
        },
      ]),
    "text must be a string",
  );
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertReturnsScopedFixtureDocuments();
  await assertUnregisteredSourceReturnsEmpty();
  await assertDefensiveCopy();
  await assertRejectsInvalidSourceIdentifiers();
  await assertRejectsInvalidFixtures();
  console.log("FakeKnowledgeSourceConnector validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
