/**
 * Canonical knowledge source — framework-independent domain type.
 * Zero outward dependencies (Clean Architecture / DDD).
 *
 * A minimal registry entry identifying an external knowledge origin within
 * a workspace. `workspaceId` is the same logical tenancy boundary used by
 * `KnowledgeDocument`: `id` is only unique within that workspace, and the
 * same `id` may exist independently in different workspaces.
 *
 * Connector details (URL, credentials, sync state) and any link to
 * `KnowledgeDocument` are intentionally out of scope until a later task
 * scopes them.
 */
export interface KnowledgeSource {
  workspaceId: string;
  id: string;
  name: string;
}
