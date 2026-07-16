import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

/**
 * In-memory adapter for {@link KnowledgeDocumentRepository}.
 *
 * Storage is partitioned by `workspaceId` first, then keyed by `id` within
 * that partition — so the same `id` can exist independently in different
 * workspaces, and every read/write is scoped to exactly one workspace.
 *
 * Suitable for validation and early composition wiring. Replaceable by a
 * database adapter behind the same port with no domain/application changes.
 */
export class DefaultInMemoryRepository implements KnowledgeDocumentRepository {
  private readonly documentsByWorkspace = new Map<
    string,
    Map<string, KnowledgeDocument>
  >();

  async save(document: KnowledgeDocument): Promise<void> {
    this.assertDocument(document);
    const workspace = this.getOrCreateWorkspace(document.workspaceId);
    workspace.set(document.id, this.clone(document));
  }

  async findById(
    workspaceId: string,
    id: string,
  ): Promise<KnowledgeDocument | null> {
    this.assertWorkspaceId(workspaceId);
    this.assertId(id);
    const stored = this.documentsByWorkspace.get(workspaceId)?.get(id);
    return stored ? this.clone(stored) : null;
  }

  async findAll(workspaceId: string): Promise<KnowledgeDocument[]> {
    this.assertWorkspaceId(workspaceId);
    const workspace = this.documentsByWorkspace.get(workspaceId);
    if (!workspace) {
      return [];
    }
    return Array.from(workspace.values()).map((document) =>
      this.clone(document),
    );
  }

  async deleteById(workspaceId: string, id: string): Promise<void> {
    this.assertWorkspaceId(workspaceId);
    this.assertId(id);
    this.documentsByWorkspace.get(workspaceId)?.delete(id);
  }

  private getOrCreateWorkspace(
    workspaceId: string,
  ): Map<string, KnowledgeDocument> {
    let workspace = this.documentsByWorkspace.get(workspaceId);
    if (!workspace) {
      workspace = new Map<string, KnowledgeDocument>();
      this.documentsByWorkspace.set(workspaceId, workspace);
    }
    return workspace;
  }

  private assertDocument(document: KnowledgeDocument): void {
    if (!document || typeof document !== "object") {
      throw new Error("KnowledgeDocument must be an object");
    }
    this.assertWorkspaceId(document.workspaceId);
    this.assertId(document.id);
    if (typeof document.title !== "string" || document.title.trim().length === 0) {
      throw new Error("KnowledgeDocument.title must be a non-empty string");
    }
    if (typeof document.text !== "string") {
      throw new Error("KnowledgeDocument.text must be a string");
    }
  }

  private assertWorkspaceId(workspaceId: string): void {
    if (typeof workspaceId !== "string" || workspaceId.trim().length === 0) {
      throw new Error("KnowledgeDocument.workspaceId must be a non-empty string");
    }
  }

  private assertId(id: string): void {
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new Error("KnowledgeDocument.id must be a non-empty string");
    }
  }

  private clone(document: KnowledgeDocument): KnowledgeDocument {
    return {
      workspaceId: document.workspaceId,
      id: document.id,
      title: document.title,
      text: document.text,
    };
  }
}
