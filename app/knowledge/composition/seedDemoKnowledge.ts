import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";

/** Stable token that FakeEmbeddingProvider retrieval can hit. */
export const DEMO_CHUNK_TEXT = "aaaaaaaa";
export const DEMO_QUERY = DEMO_CHUNK_TEXT;

/**
 * Seeds InMemory composition with one document/chunk/vector for local
 * cited-answers demos (P2 Service Completion Phase A).
 */
export async function seedDemoKnowledge(
  composition: InMemoryKnowledgeComposition,
  workspaceId: string = "workspace-a",
): Promise<void> {
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
