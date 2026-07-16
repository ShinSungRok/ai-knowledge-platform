/**
 * Skeleton module: `app/knowledge/domain`
 *
 * Canonical, framework-independent knowledge types. Zero outward dependencies.
 */
export const KNOWLEDGE_MODULE_DOMAIN = "app/knowledge/domain" as const;

export type { KnowledgeDocument } from "./KnowledgeDocument";
export type { KnowledgeSource } from "./KnowledgeSource";
export type { DocumentChunk } from "./DocumentChunk";
