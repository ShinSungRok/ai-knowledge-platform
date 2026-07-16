/**
 * Skeleton module: `app/knowledge/persistence`
 *
 * Concrete repository adapters (JSON, PostgreSQL, in-memory, etc.).
 */
export const KNOWLEDGE_MODULE_PERSISTENCE = "app/knowledge/persistence" as const;

export { DefaultInMemoryRepository } from "./DefaultInMemoryRepository";
export { DefaultInMemoryKnowledgeSourceRepository } from "./DefaultInMemoryKnowledgeSourceRepository";
export { DefaultInMemoryDocumentChunkRepository } from "./DefaultInMemoryDocumentChunkRepository";
