import type { AgentReviewDecision } from "./AgentReviewDecision";

/**
 * Structured reviewer outcome: an {@link AgentReviewDecision} plus a
 * human-readable reason. Reviewers must not re-interpret Domain/RAG
 * answer content — they judge tool-call status (and plan/result shape)
 * only.
 */
export interface AgentReviewResult {
  decision: AgentReviewDecision;
  reason: string;
}
