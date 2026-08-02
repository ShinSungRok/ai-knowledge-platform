/**
 * Per-case score from {@link WorkflowRunContentEvaluator}.
 *
 * Distinct from {@link WorkflowCaseScore}: that one scores structural
 * artifacts (status/steps/roles/handoff/memory); this one scores whether
 * the run's actual output content satisfies the case objective.
 */
export interface WorkflowContentCaseScore {
  caseId: string;
  passed: boolean;
  /** LLM judgment normalized to 0..1 (raw/10). Absent when unparseable. */
  score?: number;
  failureReasons?: readonly string[];
}
