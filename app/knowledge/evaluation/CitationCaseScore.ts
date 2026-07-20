/**
 * Per-case citation score for evidence-bound citation correctness.
 */
export interface CitationCaseScore {
  caseId: string;
  passed: boolean;
  citationCount: number;
  evidenceCount: number;
}
