/**
 * Module: `app/knowledge/reliability`
 *
 * Deterministic retry and timeout policies for Operations.
 *
 * `DefaultRetryPolicy` retries failed operations with no delay.
 * `DefaultTimeoutPolicy` races operations against `setTimeout` via
 * `Promise.race`. Circuit breakers and wiring into tools/jobs/HTTP
 * remain out of scope.
 */
export const KNOWLEDGE_MODULE_RELIABILITY = "app/knowledge/reliability" as const;

export type { RetryDecision } from "./RetryDecision";
export type { RetryPolicy } from "./RetryPolicy";
export { DefaultRetryPolicy } from "./DefaultRetryPolicy";
export type { TimeoutPolicy } from "./TimeoutPolicy";
export { DefaultTimeoutPolicy } from "./DefaultTimeoutPolicy";
