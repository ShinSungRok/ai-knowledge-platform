/**
 * Module: `app/knowledge/persistence`
 *
 * Concrete repository adapters (in-memory, SQL-backed via SqlGateway, etc.).
 */
export const KNOWLEDGE_MODULE_PERSISTENCE = "app/knowledge/persistence" as const;

export { DefaultInMemoryRepository } from "./DefaultInMemoryRepository";
export { DefaultInMemoryKnowledgeSourceRepository } from "./DefaultInMemoryKnowledgeSourceRepository";
export { DefaultInMemoryDocumentChunkRepository } from "./DefaultInMemoryDocumentChunkRepository";
export { SqlKnowledgeDocumentRepository } from "./SqlKnowledgeDocumentRepository";
export { SqlKnowledgeSourceRepository } from "./SqlKnowledgeSourceRepository";
export { SqlDocumentChunkRepository } from "./SqlDocumentChunkRepository";
