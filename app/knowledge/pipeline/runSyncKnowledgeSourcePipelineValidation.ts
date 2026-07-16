import {
  SyncKnowledgeSourcePipeline,
  type SyncKnowledgeSourceResult,
} from "./SyncKnowledgeSourcePipeline";
import {
  FakeKnowledgeSourceConnector,
  type FakeKnowledgeSourceFixture,
} from "./FakeKnowledgeSourceConnector";
import type {
  ConnectorDocument,
  KnowledgeSourceConnector,
} from "./KnowledgeSourceConnector";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import { DefaultInMemoryKnowledgeSourceRepository } from "../persistence/DefaultInMemoryKnowledgeSourceRepository";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";
import type { KnowledgeSource } from "../domain/KnowledgeSource";

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

/** Test-only spy — counts fetchDocuments calls without fetching anything. */
class CountingConnector implements KnowledgeSourceConnector {
  callCount = 0;

  async fetchDocuments(_source: KnowledgeSource): Promise<ConnectorDocument[]> {
    this.callCount += 1;
    return [];
  }
}

/**
 * Test-only connector returning fixed, unvalidated documents — unlike
 * {@link FakeKnowledgeSourceConnector}, it performs no input validation, so
 * it can exercise the pipeline's own defensive validation of whatever a
 * (potentially less strict) real connector might return.
 */
class StaticConnector implements KnowledgeSourceConnector {
  constructor(private readonly documents: ConnectorDocument[]) {}

  async fetchDocuments(_source: KnowledgeSource): Promise<ConnectorDocument[]> {
    return this.documents;
  }
}

async function registerSource(
  sourceRepository: KnowledgeSourceRepository,
  workspaceId: string,
  id: string = SOURCE_1,
): Promise<void> {
  await sourceRepository.save({ workspaceId, id, name: "Docs Portal" });
}

function buildPipeline(
  sourceRepository: KnowledgeSourceRepository,
  documentRepository: KnowledgeDocumentRepository,
  connector: KnowledgeSourceConnector,
): SyncKnowledgeSourcePipeline {
  return new SyncKnowledgeSourcePipeline(sourceRepository, documentRepository, connector);
}

async function assertRejectsMissingSourceWithoutSideEffects(): Promise<void> {
  console.log("[pipeline] sync rejects an unregistered source without calling the connector or saving...");
  const sourceRepository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  const documentRepository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const connector = new CountingConnector();
  const pipeline = buildPipeline(sourceRepository, documentRepository, connector);

  await assertRejects(
    pipeline.sync({ workspaceId: WORKSPACE_A, sourceId: SOURCE_1 }),
    "KnowledgeSource not found",
  );

  assertEqual(connector.callCount, 0, "connector must not be called when the source is missing");
  const stored = await documentRepository.findAll(WORKSPACE_A);
  assertEqual(stored.length, 0, "no document must be saved when the source is missing");
}

async function assertRejectsSourceFromDifferentWorkspace(): Promise<void> {
  console.log("[pipeline] sync rejects a source id registered only in a different workspace...");
  const sourceRepository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_B);
  const documentRepository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const connector = new CountingConnector();
  const pipeline = buildPipeline(sourceRepository, documentRepository, connector);

  await assertRejects(
    pipeline.sync({ workspaceId: WORKSPACE_A, sourceId: SOURCE_1 }),
    "KnowledgeSource not found",
  );
  assertEqual(connector.callCount, 0, "connector must not be called for a cross-workspace source id");
}

async function assertGeneratesDeterministicCanonicalId(): Promise<void> {
  console.log("[pipeline] sync generates the exact encodeURIComponent canonical id...");
  const sourceRepository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  const sourceId = "docs portal";
  await registerSource(sourceRepository, WORKSPACE_A, sourceId);
  const documentRepository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const externalId = "path/to doc:1";
  const fixtures: FakeKnowledgeSourceFixture[] = [
    {
      workspaceId: WORKSPACE_A,
      sourceId,
      documents: [{ externalId, title: "Doc", text: "body" }],
    },
  ];
  const connector: KnowledgeSourceConnector = new FakeKnowledgeSourceConnector(fixtures);
  const pipeline = buildPipeline(sourceRepository, documentRepository, connector);

  const result = await pipeline.sync({ workspaceId: WORKSPACE_A, sourceId });
  assertEqual(result.fetchedCount, 1, "fetchedCount mismatch");
  assertEqual(result.savedCount, 1, "savedCount mismatch");

  const expectedId = `${encodeURIComponent(sourceId)}:${encodeURIComponent(externalId)}`;
  const stored = await documentRepository.findById(WORKSPACE_A, expectedId);
  assertTruthy(stored, `Expected a document stored at canonical id ${expectedId}`);
  assertEqual(stored?.sourceId, sourceId, "stored document sourceId mismatch");
  assertEqual(stored?.title, "Doc", "stored document title mismatch");
}

async function assertResyncUpdatesInPlaceWithoutDuplication(): Promise<void> {
  console.log("[pipeline] re-syncing the same external id updates the document in place...");
  const sourceRepository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_A);
  const documentRepository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const fixtures: FakeKnowledgeSourceFixture[] = [
    {
      workspaceId: WORKSPACE_A,
      sourceId: SOURCE_1,
      documents: [{ externalId: "ext-1", title: "Original", text: "original body" }],
    },
  ];
  const connector: KnowledgeSourceConnector = new FakeKnowledgeSourceConnector(fixtures);
  const pipeline = buildPipeline(sourceRepository, documentRepository, connector);

  const first = await pipeline.sync({ workspaceId: WORKSPACE_A, sourceId: SOURCE_1 });
  assertEqual(first.savedCount, 1, "first sync savedCount mismatch");

  // Re-sync with the *same* external id but changed title/text via a fresh
  // connector fixture — same source, same canonical id.
  const secondFixtures: FakeKnowledgeSourceFixture[] = [
    {
      workspaceId: WORKSPACE_A,
      sourceId: SOURCE_1,
      documents: [{ externalId: "ext-1", title: "Updated", text: "updated body" }],
    },
  ];
  const secondConnector: KnowledgeSourceConnector = new FakeKnowledgeSourceConnector(secondFixtures);
  const secondPipeline = buildPipeline(sourceRepository, documentRepository, secondConnector);
  const second: SyncKnowledgeSourceResult = await secondPipeline.sync({
    workspaceId: WORKSPACE_A,
    sourceId: SOURCE_1,
  });
  assertEqual(second.fetchedCount, 1, "second sync fetchedCount mismatch");
  assertEqual(second.savedCount, 1, "second sync savedCount mismatch");

  const all = await documentRepository.findAll(WORKSPACE_A);
  assertEqual(all.length, 1, "re-sync must not create a duplicate document");
  assertEqual(all[0]?.title, "Updated", "re-sync must update title in place");
  assertEqual(all[0]?.text, "updated body", "re-sync must update text in place");
}

async function assertRejectsDuplicateExternalIdWithinBatch(): Promise<void> {
  console.log("[pipeline] sync rejects a batch with a duplicate externalId, saving nothing...");
  const sourceRepository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_A);
  const documentRepository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const fixtures: FakeKnowledgeSourceFixture[] = [
    {
      workspaceId: WORKSPACE_A,
      sourceId: SOURCE_1,
      documents: [
        { externalId: "ext-1", title: "First", text: "first body" },
        { externalId: "ext-1", title: "Duplicate", text: "duplicate body" },
      ],
    },
  ];
  const connector: KnowledgeSourceConnector = new FakeKnowledgeSourceConnector(fixtures);
  const pipeline = buildPipeline(sourceRepository, documentRepository, connector);

  await assertRejects(
    pipeline.sync({ workspaceId: WORKSPACE_A, sourceId: SOURCE_1 }),
    "Duplicate externalId within sync batch",
  );

  const stored = await documentRepository.findAll(WORKSPACE_A);
  assertEqual(stored.length, 0, "no document must be saved when the batch has a duplicate externalId");
}

async function assertRejectsCanonicalIdConflictWithDifferentSource(): Promise<void> {
  console.log("[pipeline] sync rejects the whole batch when the canonical id belongs to a different source...");
  const sourceRepository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_A, SOURCE_1);
  const documentRepository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();

  const conflictingExternalId = "ext-conflict";
  const conflictingCanonicalId = `${encodeURIComponent(SOURCE_1)}:${encodeURIComponent(conflictingExternalId)}`;
  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: conflictingCanonicalId,
    sourceId: "some-other-source",
    title: "Pre-existing",
    text: "pre-existing body",
  });

  const fixtures: FakeKnowledgeSourceFixture[] = [
    {
      workspaceId: WORKSPACE_A,
      sourceId: SOURCE_1,
      documents: [
        { externalId: "ext-valid", title: "Valid", text: "valid body" },
        { externalId: conflictingExternalId, title: "Conflict", text: "conflict body" },
      ],
    },
  ];
  const connector: KnowledgeSourceConnector = new FakeKnowledgeSourceConnector(fixtures);
  const pipeline = buildPipeline(sourceRepository, documentRepository, connector);

  await assertRejects(
    pipeline.sync({ workspaceId: WORKSPACE_A, sourceId: SOURCE_1 }),
    "already exists under a different source",
  );

  const validCanonicalId = `${encodeURIComponent(SOURCE_1)}:${encodeURIComponent("ext-valid")}`;
  const shouldNotExist = await documentRepository.findById(WORKSPACE_A, validCanonicalId);
  assertEqual(
    shouldNotExist,
    null,
    "the batch's other, otherwise-valid document must not be saved when any document conflicts",
  );
}

async function assertRejectsInvalidConnectorDocumentWithoutPartialSave(): Promise<void> {
  console.log("[pipeline] sync rejects an invalid connector document, saving nothing from the batch...");
  const sourceRepository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_A);
  const documentRepository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  // Uses a StaticConnector (not FakeKnowledgeSourceConnector) because the
  // fake already rejects this shape at fixture-registration time — this
  // test targets the pipeline's own defensive validation of connector
  // output, independent of any specific connector implementation.
  const connector: KnowledgeSourceConnector = new StaticConnector([
    { externalId: "ext-1", title: "Valid", text: "valid body" },
    { externalId: "ext-2", title: " ", text: "invalid title" },
  ]);
  const pipeline = buildPipeline(sourceRepository, documentRepository, connector);

  await assertRejects(
    pipeline.sync({ workspaceId: WORKSPACE_A, sourceId: SOURCE_1 }),
    "title must be a non-empty string",
  );

  const stored = await documentRepository.findAll(WORKSPACE_A);
  assertEqual(stored.length, 0, "the batch's valid document must not be saved when a later one is invalid");
}

async function assertRejectsInvalidPipelineInput(): Promise<void> {
  console.log("[pipeline] sync rejects invalid workspaceId/sourceId input...");
  const sourceRepository: KnowledgeSourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  const documentRepository: KnowledgeDocumentRepository = new DefaultInMemoryRepository();
  const connector = new CountingConnector();
  const pipeline = buildPipeline(sourceRepository, documentRepository, connector);

  await assertRejects(
    pipeline.sync({ workspaceId: " ", sourceId: SOURCE_1 }),
    "workspaceId must be a non-empty string",
  );
  await assertRejects(
    pipeline.sync({ workspaceId: WORKSPACE_A, sourceId: " " }),
    "sourceId must be a non-empty string",
  );
  assertEqual(connector.callCount, 0, "connector must not be called for invalid input");
}

async function main(): Promise<void> {
  await assertRejectsMissingSourceWithoutSideEffects();
  await assertRejectsSourceFromDifferentWorkspace();
  await assertGeneratesDeterministicCanonicalId();
  await assertResyncUpdatesInPlaceWithoutDuplication();
  await assertRejectsDuplicateExternalIdWithinBatch();
  await assertRejectsCanonicalIdConflictWithDifferentSource();
  await assertRejectsInvalidConnectorDocumentWithoutPartialSave();
  await assertRejectsInvalidPipelineInput();
  console.log("SyncKnowledgeSourcePipeline validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
