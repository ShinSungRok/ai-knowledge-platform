import type { KnowledgeSource } from "../domain/KnowledgeSource";

/**
 * Persistence-agnostic port for knowledge source registration.
 *
 * Every read/write is scoped to a `workspaceId`. Concrete adapters must
 * treat `(workspaceId, id)` as the effective identity of a source — the
 * same `id` may exist independently in different workspaces, and no method
 * may return or mutate a source belonging to a different workspace than
 * the one requested.
 *
 * Concrete adapters (in-memory, PostgreSQL, …) live under
 * `app/knowledge/persistence` and are wired only at the composition root.
 */
export interface KnowledgeSourceRepository {
  save(source: KnowledgeSource): Promise<void>;
  findById(workspaceId: string, id: string): Promise<KnowledgeSource | null>;
}
