/**
 * Canonical knowledge document — framework-independent domain type.
 * Zero outward dependencies (Clean Architecture / DDD).
 *
 * `workspaceId` is the minimal logical tenancy boundary for Project 2:
 * every document belongs to exactly one workspace, and `id` is only unique
 * within that workspace (the same `id` may exist independently in different
 * workspaces).
 */
export interface KnowledgeDocument {
  workspaceId: string;
  id: string;
  title: string;
  text: string;
}
