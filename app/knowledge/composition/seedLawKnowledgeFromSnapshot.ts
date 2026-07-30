import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { ConnectorDocument } from "../pipeline/KnowledgeSourceConnector";
import type { SeedableKnowledgeSurface } from "./seedDemoKnowledge";

const SNAPSHOT_PATH = "app/knowledge/composition/data/lawKnowledgeSnapshot.json";

interface LawKnowledgeSnapshot {
  fetchedAt: string;
  sources: Array<{ workspaceId: string; id: string; name: string }>;
  documentsBySourceId: Record<string, ConnectorDocument[]>;
}

/**
 * Seeds the static law.go.kr snapshot (written once by
 * `runFetchLawKnowledgeSnapshot.ts`) into composition — no network call
 * here, only a local file read, so the default `pnpm start` path stays
 * dependency-free. Additive to `seedDemoKnowledge`: it never removes or
 * replaces the existing MFA/VPN demo document, it just gives retrieval
 * more than one real chunk to actually choose between.
 *
 * A missing snapshot file is not an error — it just means nobody has run
 * `pnpm demo:seed:law-snapshot` yet, so this is a no-op.
 */
export async function seedLawKnowledgeFromSnapshot(
  composition: SeedableKnowledgeSurface,
): Promise<number> {
  const snapshotPath = path.resolve(process.cwd(), SNAPSHOT_PATH);
  if (!existsSync(snapshotPath)) {
    return 0;
  }

  const snapshot: LawKnowledgeSnapshot = JSON.parse(
    readFileSync(snapshotPath, "utf8"),
  );
  let seededCount = 0;

  for (const source of snapshot.sources) {
    if (composition.knowledgeSourceRepository !== undefined) {
      await composition.knowledgeSourceRepository.save({
        workspaceId: source.workspaceId,
        id: source.id,
        name: source.name,
      });
    }

    const documents = snapshot.documentsBySourceId[source.id] ?? [];
    for (const connectorDocument of documents) {
      const documentId = `${source.id}-${connectorDocument.externalId}`;

      const document: KnowledgeDocument = {
        workspaceId: source.workspaceId,
        id: documentId,
        sourceId: source.id,
        title: connectorDocument.title,
        text: connectorDocument.text,
      };
      await composition.knowledgeDocumentRepository.save(document);

      const chunk: DocumentChunk = {
        workspaceId: source.workspaceId,
        id: `${documentId}-chunk-1`,
        documentId,
        text: connectorDocument.text,
        order: 0,
      };
      await composition.documentChunkRepository.replaceForDocument(
        source.workspaceId,
        documentId,
        [chunk],
      );

      const vector = await composition.embeddingProvider.embed(chunk.text);
      await composition.vectorIndex.upsert({
        workspaceId: source.workspaceId,
        chunkId: chunk.id,
        vector,
      });

      seededCount += 1;
    }
  }

  return seededCount;
}
