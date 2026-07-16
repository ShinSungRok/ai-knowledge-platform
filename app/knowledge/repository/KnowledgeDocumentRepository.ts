import type { KnowledgeDocument } from "../domain/KnowledgeDocument";

/**
 * Persistence-agnostic port for knowledge document storage.
 *
 * Every read/write is scoped to a `workspaceId`. Concrete adapters must
 * treat `(workspaceId, id)` as the effective identity of a document — the
 * same `id` may exist independently in different workspaces, and no method
 * may return or mutate a document belonging to a different workspace than
 * the one requested.
 *
 * Concrete adapters (in-memory, PostgreSQL, …) live under
 * `app/knowledge/persistence` and are wired only at the composition root.
 */
export interface KnowledgeDocumentRepository {
  save(document: KnowledgeDocument): Promise<void>;
  findById(workspaceId: string, id: string): Promise<KnowledgeDocument | null>;
  findAll(workspaceId: string): Promise<KnowledgeDocument[]>;
  deleteById(workspaceId: string, id: string): Promise<void>;
}
