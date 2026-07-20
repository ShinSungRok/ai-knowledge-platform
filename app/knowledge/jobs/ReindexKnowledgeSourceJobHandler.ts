import type { RechunkKnowledgeSourcePipeline } from "../pipeline/RechunkKnowledgeSourcePipeline";
import type { ReindexKnowledgeSourceEmbeddingsPipeline } from "../pipeline/ReindexKnowledgeSourceEmbeddingsPipeline";
import type { JobHandler } from "./JobHandler";
import type { JobRecord } from "./JobRecord";

/**
 * Job handler for `reindex_knowledge_source`: rechunks the source, then
 * reindexes embeddings, returning mapped count fields.
 *
 * Depends only on the rechunk and reindex pipelines. If rechunk throws,
 * reindex is never called.
 */
export class ReindexKnowledgeSourceJobHandler implements JobHandler {
  readonly type = "reindex_knowledge_source" as const;

  constructor(
    private readonly rechunkPipeline: RechunkKnowledgeSourcePipeline,
    private readonly reindexPipeline: ReindexKnowledgeSourceEmbeddingsPipeline,
  ) {}

  async execute(job: JobRecord): Promise<Readonly<Record<string, unknown>>> {
    const rechunked = await this.rechunkPipeline.rechunk({
      workspaceId: job.workspaceId,
      sourceId: job.sourceId,
    });
    const reindexed = await this.reindexPipeline.reindex({
      workspaceId: job.workspaceId,
      sourceId: job.sourceId,
    });
    return {
      sourceId: job.sourceId,
      rechunkedDocumentCount: rechunked.processedDocumentCount,
      savedChunkCount: rechunked.savedChunkCount,
      reindexedDocumentCount: reindexed.processedDocumentCount,
      embeddedChunkCount: reindexed.embeddedChunkCount,
    };
  }
}
