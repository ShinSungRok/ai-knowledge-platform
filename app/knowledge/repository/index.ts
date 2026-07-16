/**
 * Skeleton module: `app/knowledge/repository`
 *
 * Persistence-agnostic document access ports.
 */
export const KNOWLEDGE_MODULE_REPOSITORY = "app/knowledge/repository" as const;

export type { KnowledgeDocumentRepository } from "./KnowledgeDocumentRepository";
export type { KnowledgeSourceRepository } from "./KnowledgeSourceRepository";
