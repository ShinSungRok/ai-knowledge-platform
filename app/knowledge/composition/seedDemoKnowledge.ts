import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeSource } from "../domain/KnowledgeSource";
import type { VectorIndex } from "../embedding/VectorIndex";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";

/** Stable token that FakeEmbeddingProvider retrieval can hit. */
export const DEMO_CHUNK_TEXT = "aaaaaaaa";
export const DEMO_QUERY = DEMO_CHUNK_TEXT;

/**
 * Minimal surface required to seed demo document/chunk/vector for local
 * cited-answers (InMemory or SQL/Postgres compositions).
 */
export type SeedableKnowledgeSurface = {
  knowledgeDocumentRepository: KnowledgeDocumentRepository;
  documentChunkRepository: DocumentChunkRepository;
  vectorIndex: VectorIndex;
  /** When present (SQL compositions), registers demo source before document. */
  knowledgeSourceRepository?: KnowledgeSourceRepository;
};

/**
 * Seeds composition with one document/chunk/vector for local cited-answers
 * demos (P2 Service Completion Phase A/B).
 */
export async function seedDemoKnowledge(
  composition: SeedableKnowledgeSurface,
  workspaceId: string = "workspace-a",
): Promise<void> {
  if (composition.knowledgeSourceRepository !== undefined) {
    const source: KnowledgeSource = {
      workspaceId,
      id: "demo-source-1",
      name: "Demo Source",
    };
    await composition.knowledgeSourceRepository.save(source);
  }

  const document: KnowledgeDocument = {
    workspaceId,
    id: "demo-doc-1",
    sourceId: "demo-source-1",
    title: "Demo Knowledge Document",
    text: `Demo corpus for cited-answers. Key token: ${DEMO_CHUNK_TEXT}`,
  };
  await composition.knowledgeDocumentRepository.save(document);

  const chunk: DocumentChunk = {
    workspaceId,
    id: "demo-chunk-1",
    documentId: document.id,
    text: DEMO_CHUNK_TEXT,
    order: 0,
  };
  await composition.documentChunkRepository.replaceForDocument(
    workspaceId,
    document.id,
    [chunk],
  );

  const embeddingProvider = new FakeEmbeddingProvider();
  const vector = await embeddingProvider.embed(chunk.text);
  await composition.vectorIndex.upsert({
    workspaceId,
    chunkId: chunk.id,
    vector,
  });
}
