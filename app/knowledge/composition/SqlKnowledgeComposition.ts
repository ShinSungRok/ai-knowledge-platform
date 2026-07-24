import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import type { VectorIndex } from "../embedding/VectorIndex";
import type { SqlGateway } from "../infra/SqlGateway";
import type { McpJsonRpcHandler } from "../mcp/McpJsonRpcHandler";
import type { SqlDocumentChunkRepository } from "../persistence/SqlDocumentChunkRepository";
import type { SqlKnowledgeDocumentRepository } from "../persistence/SqlKnowledgeDocumentRepository";
import type { SqlKnowledgeSourceRepository } from "../persistence/SqlKnowledgeSourceRepository";
import type { KnowledgeRuntime } from "./KnowledgeRuntime";

/**
 * Composition handle with SQL-backed document, source, chunk, and vector
 * index repositories sharing one {@link SqlGateway}, plus cited-answer
 * runtime and MCP JSON-RPC handler for listening hosts.
 */
export interface SqlKnowledgeComposition {
  runtime: KnowledgeRuntime;
  mcpJsonRpcHandler: McpJsonRpcHandler;
  languageModelProvider: LanguageModelProvider;
  knowledgeDocumentRepository: SqlKnowledgeDocumentRepository;
  knowledgeSourceRepository: SqlKnowledgeSourceRepository;
  documentChunkRepository: SqlDocumentChunkRepository;
  vectorIndex: VectorIndex;
  sqlGateway: SqlGateway;
}
