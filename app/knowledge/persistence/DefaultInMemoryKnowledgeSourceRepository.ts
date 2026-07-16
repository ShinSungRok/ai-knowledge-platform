import type { KnowledgeSource } from "../domain/KnowledgeSource";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";

/**
 * In-memory adapter for {@link KnowledgeSourceRepository}.
 *
 * Storage is partitioned by `workspaceId` first, then keyed by `id` within
 * that partition — so the same `id` can exist independently in different
 * workspaces, and every read/write is scoped to exactly one workspace.
 *
 * Suitable for validation and early composition wiring. Replaceable by a
 * database adapter behind the same port with no domain/application changes.
 */
export class DefaultInMemoryKnowledgeSourceRepository
  implements KnowledgeSourceRepository
{
  private readonly sourcesByWorkspace = new Map<
    string,
    Map<string, KnowledgeSource>
  >();

  async save(source: KnowledgeSource): Promise<void> {
    this.assertSource(source);
    const workspace = this.getOrCreateWorkspace(source.workspaceId);
    workspace.set(source.id, this.clone(source));
  }

  async findById(
    workspaceId: string,
    id: string,
  ): Promise<KnowledgeSource | null> {
    this.assertWorkspaceId(workspaceId);
    this.assertId(id);
    const stored = this.sourcesByWorkspace.get(workspaceId)?.get(id);
    return stored ? this.clone(stored) : null;
  }

  private getOrCreateWorkspace(
    workspaceId: string,
  ): Map<string, KnowledgeSource> {
    let workspace = this.sourcesByWorkspace.get(workspaceId);
    if (!workspace) {
      workspace = new Map<string, KnowledgeSource>();
      this.sourcesByWorkspace.set(workspaceId, workspace);
    }
    return workspace;
  }

  private assertSource(source: KnowledgeSource): void {
    if (!source || typeof source !== "object") {
      throw new Error("KnowledgeSource must be an object");
    }
    this.assertWorkspaceId(source.workspaceId);
    this.assertId(source.id);
    if (typeof source.name !== "string" || source.name.trim().length === 0) {
      throw new Error("KnowledgeSource.name must be a non-empty string");
    }
  }

  private assertWorkspaceId(workspaceId: string): void {
    if (typeof workspaceId !== "string" || workspaceId.trim().length === 0) {
      throw new Error("KnowledgeSource.workspaceId must be a non-empty string");
    }
  }

  private assertId(id: string): void {
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new Error("KnowledgeSource.id must be a non-empty string");
    }
  }

  private clone(source: KnowledgeSource): KnowledgeSource {
    return {
      workspaceId: source.workspaceId,
      id: source.id,
      name: source.name,
    };
  }
}
