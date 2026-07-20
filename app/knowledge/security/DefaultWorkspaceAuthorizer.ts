import type { WorkspaceAuthorizer } from "./WorkspaceAuthorizer";

/**
 * Default {@link WorkspaceAuthorizer}: principal workspace id must equal
 * the target workspace id.
 */
export class DefaultWorkspaceAuthorizer implements WorkspaceAuthorizer {
  authorize(input: {
    workspaceId: string;
    principalWorkspaceId: string;
  }): void {
    const workspaceId = input?.workspaceId;
    const principalWorkspaceId = input?.principalWorkspaceId;
    if (
      typeof workspaceId !== "string" ||
      workspaceId.trim().length === 0 ||
      typeof principalWorkspaceId !== "string" ||
      principalWorkspaceId.trim().length === 0
    ) {
      throw new Error("workspaceId and principalWorkspaceId must be non-empty strings");
    }
    if (workspaceId !== principalWorkspaceId) {
      throw new Error("Workspace access denied");
    }
  }
}
