/**
 * Input for reconciling removed documents (and their chunks/vectors) for one
 * knowledge source within a workspace.
 */
export interface KnowledgeSourceReconcileInput {
  workspaceId: string;
  sourceId: string;
  removedDocumentIds: readonly string[];
}

/**
 * Result counts from a reconcile pass.
 */
export interface KnowledgeSourceReconcileResult {
  removedDocumentCount: number;
  removedChunkCount: number;
  removedVectorCount: number;
}

/**
 * Port for cleaning up documents that disappeared from a knowledge source.
 * Implementations use document/chunk/vector ports only — they do not upsert
 * or fetch from connectors.
 */
export interface KnowledgeSourceReconciler {
  reconcile(
    input: KnowledgeSourceReconcileInput,
  ): Promise<KnowledgeSourceReconcileResult>;
}
