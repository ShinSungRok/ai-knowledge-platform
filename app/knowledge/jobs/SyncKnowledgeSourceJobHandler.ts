import type { ReconcilingSyncKnowledgeSourcePipeline } from "../pipeline/ReconcilingSyncKnowledgeSourcePipeline";
import type { JobHandler } from "./JobHandler";
import type { JobRecord } from "./JobRecord";

/**
 * Job handler for `sync_knowledge_source`: delegates to
 * {@link ReconcilingSyncKnowledgeSourcePipeline} and returns the lifecycle
 * summary fields as a plain object.
 *
 * Depends only on the reconciling sync pipeline — never on a concrete
 * connector or repository adapter.
 */
export class SyncKnowledgeSourceJobHandler implements JobHandler {
  readonly type = "sync_knowledge_source" as const;

  constructor(
    private readonly pipeline: ReconcilingSyncKnowledgeSourcePipeline,
  ) {}

  async execute(job: JobRecord): Promise<Readonly<Record<string, unknown>>> {
    const result = await this.pipeline.sync({
      workspaceId: job.workspaceId,
      sourceId: job.sourceId,
    });
    return {
      sourceId: result.sourceId,
      fetchedCount: result.fetchedCount,
      addedCount: result.addedCount,
      updatedCount: result.updatedCount,
      unchangedCount: result.unchangedCount,
      removedDocumentCount: result.removedDocumentCount,
      removedChunkCount: result.removedChunkCount,
      removedVectorCount: result.removedVectorCount,
    };
  }
}
