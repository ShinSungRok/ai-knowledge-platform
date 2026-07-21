import type { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import type { McpJsonRpcHandler } from "../mcp/McpJsonRpcHandler";
import type { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import type { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import type { KnowledgeRuntime } from "./KnowledgeRuntime";

/**
 * In-memory composition handle: runtime entrypoint plus the seeded
 * repositories/index used by validation and local runs.
 */
export interface InMemoryKnowledgeComposition {
  runtime: KnowledgeRuntime;
  mcpJsonRpcHandler: McpJsonRpcHandler;
  knowledgeDocumentRepository: DefaultInMemoryRepository;
  documentChunkRepository: DefaultInMemoryDocumentChunkRepository;
  vectorIndex: InMemoryVectorIndex;
}
