/**
 * Per-case retrieval score: whether any expected chunk was retrieved, and
 * the reciprocal rank of the first expected hit.
 */
export interface RetrievalCaseScore {
  caseId: string;
  hit: boolean;
  reciprocalRank: number;
}
