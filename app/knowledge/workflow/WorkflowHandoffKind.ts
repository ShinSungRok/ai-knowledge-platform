/**
 * Kind of Multi-Agent handoff / delegation between workflow steps.
 *
 * - `sequential`: prior step output becomes the next step input
 * - `delegation`: coordinator (or prior) explicitly assigns work to a
 *   target agent
 */
export type WorkflowHandoffKind = "sequential" | "delegation";
