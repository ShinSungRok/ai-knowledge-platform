/**
 * Decision metadata for a single retry attempt.
 */
export interface RetryDecision {
  retry: boolean;
  attempt: number;
}
