import type {
  SyncKnowledgeSourcePipeline,
} from "../pipeline/SyncKnowledgeSourcePipeline";
import type { JobHandler } from "./JobHandler";
import type { JobRecord } from "./JobRecord";

/**
 * Job handler for `sync_knowledge_source`: delegates to
 * {@link SyncKnowledgeSourcePipeline} and returns
 * `{ sourceId, fetchedCount, savedCount }`.
 *
 * Depends only on the sync pipeline — never on a concrete connector or
 * repository adapter.
 */
export class SyncKnowledgeSourceJobHandler implements JobHandler {
  readonly type = "sync_knowledge_source" as const;

  constructor(private readonly pipeline: SyncKnowledgeSourcePipeline) {}

  async execute(job: JobRecord): Promise<Readonly<Record<string, unknown>>> {
    const result = await this.pipeline.sync({
      workspaceId: job.workspaceId,
      sourceId: job.sourceId,
    });
    return {
      sourceId: result.sourceId,
      fetchedCount: result.fetchedCount,
      savedCount: result.savedCount,
    };
  }
}
