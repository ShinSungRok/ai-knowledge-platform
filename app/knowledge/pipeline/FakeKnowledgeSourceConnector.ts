import type { KnowledgeSource } from "../domain/KnowledgeSource";
import type {
  ConnectorDocument,
  KnowledgeSourceConnector,
} from "./KnowledgeSourceConnector";

/**
 * A workspace + source-scoped fixture of normalized documents used to seed
 * a {@link FakeKnowledgeSourceConnector}.
 */
export interface FakeKnowledgeSourceFixture {
  workspaceId: string;
  sourceId: string;
  documents: ConnectorDocument[];
}

/**
 * Dependency-free fake adapter for {@link KnowledgeSourceConnector}.
 *
 * Fixtures are partitioned by `workspaceId` first, then keyed by `sourceId`
 * within that partition — mirroring the same workspace-scoped identity used
 * by `KnowledgeSource`/`KnowledgeDocument`. `fetchDocuments` only returns
 * the fixture documents registered for the exact `(workspaceId, id)` of the
 * requested source; a source with no matching fixture yields an empty array
 * rather than an error.
 *
 * Suitable for validation only — no network, filesystem, or database
 * access. A real connector adapter implements the same port behind an
 * HTTP/file/DB client, wired at the composition root.
 */
export class FakeKnowledgeSourceConnector implements KnowledgeSourceConnector {
  private readonly documentsByWorkspace = new Map<
    string,
    Map<string, ConnectorDocument[]>
  >();

  constructor(fixtures: FakeKnowledgeSourceFixture[] = []) {
    for (const fixture of fixtures) {
      this.registerFixture(fixture);
    }
  }

  async fetchDocuments(
    source: KnowledgeSource,
  ): Promise<ConnectorDocument[]> {
    this.assertSource(source);
    const documents = this.documentsByWorkspace
      .get(source.workspaceId)
      ?.get(source.id);
    return documents ? documents.map((document) => this.cloneDocument(document)) : [];
  }

  private registerFixture(fixture: FakeKnowledgeSourceFixture): void {
    if (!fixture || typeof fixture !== "object") {
      throw new Error("FakeKnowledgeSourceFixture must be an object");
    }
    this.assertNonEmptyString(
      fixture.workspaceId,
      "FakeKnowledgeSourceFixture.workspaceId",
    );
    this.assertNonEmptyString(
      fixture.sourceId,
      "FakeKnowledgeSourceFixture.sourceId",
    );
    if (!Array.isArray(fixture.documents)) {
      throw new Error(
        "FakeKnowledgeSourceFixture.documents must be an array",
      );
    }

    const documents = fixture.documents.map((document) =>
      this.assertAndCloneDocument(document),
    );
    const workspace = this.getOrCreateWorkspace(fixture.workspaceId);
    workspace.set(fixture.sourceId, documents);
  }

  private getOrCreateWorkspace(
    workspaceId: string,
  ): Map<string, ConnectorDocument[]> {
    let workspace = this.documentsByWorkspace.get(workspaceId);
    if (!workspace) {
      workspace = new Map<string, ConnectorDocument[]>();
      this.documentsByWorkspace.set(workspaceId, workspace);
    }
    return workspace;
  }

  private assertSource(source: KnowledgeSource): void {
    if (!source || typeof source !== "object") {
      throw new Error("KnowledgeSource must be an object");
    }
    this.assertNonEmptyString(source.workspaceId, "KnowledgeSource.workspaceId");
    this.assertNonEmptyString(source.id, "KnowledgeSource.id");
  }

  private assertAndCloneDocument(
    document: ConnectorDocument,
  ): ConnectorDocument {
    if (!document || typeof document !== "object") {
      throw new Error("ConnectorDocument must be an object");
    }
    this.assertNonEmptyString(document.externalId, "ConnectorDocument.externalId");
    this.assertNonEmptyString(document.title, "ConnectorDocument.title");
    if (typeof document.text !== "string") {
      throw new Error("ConnectorDocument.text must be a string");
    }
    return this.cloneDocument(document);
  }

  private assertNonEmptyString(value: unknown, label: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${label} must be a non-empty string`);
    }
  }

  private cloneDocument(document: ConnectorDocument): ConnectorDocument {
    return {
      externalId: document.externalId,
      title: document.title,
      text: document.text,
    };
  }
}
