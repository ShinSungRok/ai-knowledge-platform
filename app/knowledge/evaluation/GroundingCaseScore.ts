/**
 * Per-case grounding score for insufficient-evidence policy compliance.
 */
export interface GroundingCaseScore {
  caseId: string;
  passed: boolean;
  insufficientEvidence: boolean;
}
