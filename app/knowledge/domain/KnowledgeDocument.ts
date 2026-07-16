/**
 * Canonical knowledge document — framework-independent domain type.
 * Zero outward dependencies (Clean Architecture / DDD).
 *
 * `workspaceId` is the minimal logical tenancy boundary for Project 2:
 * every document belongs to exactly one workspace, and `id` is only unique
 * within that workspace (the same `id` may exist independently in different
 * workspaces).
 *
 * `sourceId` is a required provenance reference to a `KnowledgeSource`
 * registered in the same workspace. It identifies which knowledge origin a
 * document came from; it is immutable once created (no document-source
 * reassignment use case exists yet).
 */
export interface KnowledgeDocument {
  workspaceId: string;
  id: string;
  sourceId: string;
  title: string;
  text: string;
}
