import type { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import type { InMemorySqlGateway } from "../infra/InMemorySqlGateway";
import type { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import type { SqlKnowledgeDocumentRepository } from "../persistence/SqlKnowledgeDocumentRepository";
import type { KnowledgeRuntime } from "./KnowledgeRuntime";

/**
 * Composition handle with SQL-backed document repository (InMemorySqlGateway)
 * and in-memory/fake adapters for the rest of the cited-answer path.
 */
export interface SqlDocumentKnowledgeComposition {
  runtime: KnowledgeRuntime;
  knowledgeDocumentRepository: SqlKnowledgeDocumentRepository;
  documentChunkRepository: DefaultInMemoryDocumentChunkRepository;
  vectorIndex: InMemoryVectorIndex;
  sqlGateway: InMemorySqlGateway;
}
