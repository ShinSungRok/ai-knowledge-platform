import { KNOWLEDGE_MODULE_PIPELINE } from "./index";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { ConnectorDocument } from "./KnowledgeSourceConnector";
import type {
  KnowledgeSourceChangeDetector,
  KnowledgeSourceChangeDetectInput,
} from "./KnowledgeSourceChangeDetector";
import type {
  KnowledgeSourceReconciler,
  KnowledgeSourceReconcileInput,
  KnowledgeSourceReconcileResult,
} from "./KnowledgeSourceReconciler";
import type { SyncChangeKind } from "./SyncChangeKind";
import type { SyncChangeSet } from "./SyncChangeSet";
import type { SyncDocumentChange } from "./SyncDocumentChange";
import type { SyncLifecycleResult } from "./SyncLifecycleResult";
import type { SyncLifecycleStatus } from "./SyncLifecycleStatus";
import type {
  KnowledgeSourceChangeDetector as TopLevelChangeDetector,
  KnowledgeSourceReconciler as TopLevelReconciler,
  SyncChangeSet as TopLevelSyncChangeSet,
  SyncLifecycleResult as TopLevelSyncLifecycleResult,
} from "../index";

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

class FakeKnowledgeSourceChangeDetector implements KnowledgeSourceChangeDetector {
  detect(input: KnowledgeSourceChangeDetectInput): SyncChangeSet {
    const changes: SyncDocumentChange[] = input.fetched.map((doc) => ({
      kind: "added" as const,
      documentId: `${input.sourceId}:${doc.externalId}`,
      externalId: doc.externalId,
    }));
    return { sourceId: input.sourceId, changes };
  }
}

class FakeKnowledgeSourceReconciler implements KnowledgeSourceReconciler {
  async reconcile(
    input: KnowledgeSourceReconcileInput,
  ): Promise<KnowledgeSourceReconcileResult> {
    return {
      removedDocumentCount: input.removedDocumentIds.length,
      removedChunkCount: 0,
      removedVectorCount: 0,
    };
  }
}

function assertModuleConstant(): void {
  console.log(
    "[pipeline] KNOWLEDGE_MODULE_PIPELINE constant is exported correctly...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_PIPELINE,
    "app/knowledge/pipeline",
    "unexpected KNOWLEDGE_MODULE_PIPELINE value",
  );
}

async function assertPortsImplementable(): Promise<void> {
  console.log(
    "[pipeline] sync change ports (ChangeDetector/Reconciler) are implementable and callable...",
  );
  const detector: KnowledgeSourceChangeDetector =
    new FakeKnowledgeSourceChangeDetector();
  const reconciler: KnowledgeSourceReconciler =
    new FakeKnowledgeSourceReconciler();

  assertTruthy(typeof detector.detect === "function", "detect must be defined");
  assertTruthy(
    typeof reconciler.reconcile === "function",
    "reconcile must be defined",
  );

  const fetched: ConnectorDocument[] = [
    { externalId: "ext-1", title: "Title", text: "Body" },
  ];
  const existing: KnowledgeDocument[] = [];
  const changeSet = detector.detect({
    sourceId: "source-a",
    fetched,
    existing,
  });

  assertEqual(changeSet.sourceId, "source-a", "expected sourceId on change set");
  assertEqual(changeSet.changes.length, 1, "expected one change");
  assertEqual(changeSet.changes[0]?.kind, "added", "expected added kind");
  assertEqual(
    changeSet.changes[0]?.documentId,
    "source-a:ext-1",
    "expected documentId",
  );
  assertEqual(
    changeSet.changes[0]?.externalId,
    "ext-1",
    "expected externalId",
  );

  const reconcileResult = await reconciler.reconcile({
    workspaceId: "workspace-a",
    sourceId: "source-a",
    removedDocumentIds: ["doc-1"],
  });
  assertEqual(
    reconcileResult.removedDocumentCount,
    1,
    "expected removedDocumentCount",
  );
  assertEqual(reconcileResult.removedChunkCount, 0, "expected removedChunkCount");
  assertEqual(
    reconcileResult.removedVectorCount,
    0,
    "expected removedVectorCount",
  );
}

function assertChangeSetAndLifecycleShapes(): void {
  console.log(
    "[pipeline] SyncChangeSet / SyncLifecycleResult shapes accommodate contract fields...",
  );

  const kinds: SyncChangeKind[] = [
    "added",
    "updated",
    "unchanged",
    "removed",
  ];
  assertEqual(kinds.length, 4, "expected four SyncChangeKind values");

  const statuses: SyncLifecycleStatus[] = ["completed", "failed"];
  assertEqual(statuses.length, 2, "expected two SyncLifecycleStatus values");

  const change: SyncDocumentChange = {
    kind: "updated",
    documentId: "src%3Aa:ext%3A1",
    externalId: "ext:1",
  };
  const changeSet: SyncChangeSet = {
    sourceId: "source-a",
    changes: [change],
  };
  assertEqual(changeSet.changes[0]?.kind, "updated", "expected change kind");

  const completed: SyncLifecycleResult = {
    sourceId: "source-a",
    status: "completed",
    fetchedCount: 3,
    addedCount: 1,
    updatedCount: 1,
    unchangedCount: 1,
    removedDocumentCount: 0,
    removedChunkCount: 0,
    removedVectorCount: 0,
  };
  assertEqual(completed.status, "completed", "expected completed status");
  assertEqual(completed.fetchedCount, 3, "expected fetchedCount");
  assertEqual(completed.error, undefined, "expected no error on completed");

  const failed: SyncLifecycleResult = {
    sourceId: "source-a",
    status: "failed",
    fetchedCount: 0,
    addedCount: 0,
    updatedCount: 0,
    unchangedCount: 0,
    removedDocumentCount: 0,
    removedChunkCount: 0,
    removedVectorCount: 0,
    error: "boom",
  };
  assertEqual(failed.error, "boom", "expected error on failed lifecycle");
}

function assertTopLevelBarrelExportsContractTypes(): void {
  console.log(
    "[pipeline] top-level app/knowledge barrel re-exports sync change contract types...",
  );
  const detectorAssignable: KnowledgeSourceChangeDetector | null =
    null as TopLevelChangeDetector | null;
  const reconcilerAssignable: KnowledgeSourceReconciler | null =
    null as TopLevelReconciler | null;
  const changeSetAssignable: SyncChangeSet | null =
    null as TopLevelSyncChangeSet | null;
  const lifecycleAssignable: SyncLifecycleResult | null =
    null as TopLevelSyncLifecycleResult | null;

  assertTruthy(
    detectorAssignable === null,
    "expected ChangeDetector types assignable across barrels",
  );
  assertTruthy(
    reconcilerAssignable === null,
    "expected Reconciler types assignable across barrels",
  );
  assertTruthy(
    changeSetAssignable === null,
    "expected SyncChangeSet types assignable across barrels",
  );
  assertTruthy(
    lifecycleAssignable === null,
    "expected SyncLifecycleResult types assignable across barrels",
  );
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertPortsImplementable();
  assertChangeSetAndLifecycleShapes();
  assertTopLevelBarrelExportsContractTypes();
  console.log("Sync change contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
