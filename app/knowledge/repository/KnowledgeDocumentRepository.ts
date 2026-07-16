import type { KnowledgeDocument } from "../domain/KnowledgeDocument";

/**
 * Persistence-agnostic port for knowledge document storage.
 *
 * Concrete adapters (in-memory, PostgreSQL, …) live under
 * `app/knowledge/persistence` and are wired only at the composition root.
 */
export interface KnowledgeDocumentRepository {
  save(document: KnowledgeDocument): Promise<void>;
  findById(id: string): Promise<KnowledgeDocument | null>;
  findAll(): Promise<KnowledgeDocument[]>;
}
