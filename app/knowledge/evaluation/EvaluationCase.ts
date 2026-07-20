/**
 * One evaluation case: a workspace-scoped query with expected evidence
 * chunk ids and an optional insufficient-evidence expectation.
 */
export interface EvaluationCase {
  id: string;
  workspaceId: string;
  query: string;
  expectedChunkIds: readonly string[];
  expectInsufficientEvidence?: boolean;
}
