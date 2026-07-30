import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeSource } from "../domain/KnowledgeSource";
import type { EmbeddingProvider } from "../embedding/EmbeddingProvider";
import type { VectorIndex } from "../embedding/VectorIndex";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";

/** Stable token that the composition's embeddingProvider retrieval can hit. */
export const DEMO_CHUNK_TEXT =
  "Security policy Q3: MFA is mandatory for all remote VPN access. Temporary exceptions require security-team approval within 48 hours.";
export const DEMO_QUERY = "Is MFA required for VPN?";

/**
 * Minimal surface required to seed demo document/chunk/vector for local
 * cited-answers (InMemory or SQL/Postgres compositions).
 *
 * `embeddingProvider` must be the same instance the composition wires
 * into its own retrieval path — seeding with a different (e.g. Fake)
 * provider than the one queries are embedded with would compare vectors
 * from two incompatible embedding spaces, making similarity scores
 * meaningless regardless of embedding quality.
 */
export type SeedableKnowledgeSurface = {
  knowledgeDocumentRepository: KnowledgeDocumentRepository;
  documentChunkRepository: DocumentChunkRepository;
  vectorIndex: VectorIndex;
  embeddingProvider: EmbeddingProvider;
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

  const vector = await composition.embeddingProvider.embed(chunk.text);
  await composition.vectorIndex.upsert({
    workspaceId,
    chunkId: chunk.id,
    vector,
  });
}
