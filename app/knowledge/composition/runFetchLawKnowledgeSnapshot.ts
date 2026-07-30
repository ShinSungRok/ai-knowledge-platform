import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ConnectorDocument } from "../pipeline/KnowledgeSourceConnector";
import { LawGoKrKnowledgeSourceConnector } from "../pipeline/LawGoKrKnowledgeSourceConnector";
import {
  LAW_KNOWLEDGE_SOURCE_MAPPINGS,
  LAW_KNOWLEDGE_SOURCES,
} from "./lawKnowledgeSources";

/**
 * One-off manual fetch: pulls the fixed MVP law set from law.go.kr Open API
 * and writes a static snapshot JSON, committed to the repo. `pnpm start`
 * never calls law.go.kr itself — it only reads this file (see
 * `seedLawKnowledgeFromSnapshot.ts`) — so the default host stays
 * network-free. Re-run this script manually (`pnpm demo:seed:law-snapshot`)
 * to refresh the snapshot when law text changes.
 *
 * `LAW_API_OC` is the free registration id from open.law.go.kr; unset
 * falls back to law.go.kr's own published trial value `"test"`.
 */
const SNAPSHOT_PATH = "app/knowledge/composition/data/lawKnowledgeSnapshot.json";

interface LawKnowledgeSnapshot {
  fetchedAt: string;
  sources: typeof LAW_KNOWLEDGE_SOURCES;
  documentsBySourceId: Record<string, ConnectorDocument[]>;
}

async function main(): Promise<void> {
  const oc = process.env.LAW_API_OC;
  if (!oc) {
    console.log('LAW_API_OC not set; using law.go.kr published trial value "test".');
  }

  const connector = new LawGoKrKnowledgeSourceConnector(
    oc ?? "test",
    LAW_KNOWLEDGE_SOURCE_MAPPINGS,
  );

  const documentsBySourceId: Record<string, ConnectorDocument[]> = {};
  for (const source of LAW_KNOWLEDGE_SOURCES) {
    console.log(`Fetching ${source.name} (${source.id})...`);
    const documents = await connector.fetchDocuments(source);
    console.log(`  -> ${documents.length} articles`);
    documentsBySourceId[source.id] = documents;
  }

  const snapshot: LawKnowledgeSnapshot = {
    fetchedAt: new Date().toISOString(),
    sources: LAW_KNOWLEDGE_SOURCES,
    documentsBySourceId,
  };

  const outputPath = path.resolve(process.cwd(), SNAPSHOT_PATH);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Snapshot written to ${SNAPSHOT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
