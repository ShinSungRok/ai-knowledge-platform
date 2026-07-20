import type { VectorIndex } from "../embedding/VectorIndex";
import type { SqlGateway } from "../infra/SqlGateway";
import type { SqlDocumentChunkRepository } from "../persistence/SqlDocumentChunkRepository";
import type { SqlKnowledgeDocumentRepository } from "../persistence/SqlKnowledgeDocumentRepository";
import type { SqlKnowledgeSourceRepository } from "../persistence/SqlKnowledgeSourceRepository";
import type { KnowledgeRuntime } from "./KnowledgeRuntime";

/**
 * Composition handle with SQL-backed document, source, chunk, and vector
 * index repositories sharing one {@link SqlGateway}, plus in-memory/fake
 * adapters for the cited-answer path.
 */
export interface SqlKnowledgeComposition {
  runtime: KnowledgeRuntime;
  knowledgeDocumentRepository: SqlKnowledgeDocumentRepository;
  knowledgeSourceRepository: SqlKnowledgeSourceRepository;
  documentChunkRepository: SqlDocumentChunkRepository;
  vectorIndex: VectorIndex;
  sqlGateway: SqlGateway;
}
