/**
 * Canonical knowledge document — framework-independent domain type.
 * Zero outward dependencies (Clean Architecture / DDD).
 */
export interface KnowledgeDocument {
  id: string;
  title: string;
  text: string;
}
