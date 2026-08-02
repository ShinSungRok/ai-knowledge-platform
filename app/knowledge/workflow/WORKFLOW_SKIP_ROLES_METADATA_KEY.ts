/**
 * {@link WorkflowGoal.metadata} key naming a comma-separated list of
 * {@link WorkflowAgentRole} values that {@link DefaultWorkflowOrchestrator}
 * should skip for this run (e.g. `{"workflow.skipRoles": "critic"}`).
 *
 * Skipped steps get status `"skipped"`, never invoke their agent, and do
 * not block the run from completing. Unknown role tokens are ignored.
 */
export const WORKFLOW_SKIP_ROLES_METADATA_KEY = "workflow.skipRoles";
