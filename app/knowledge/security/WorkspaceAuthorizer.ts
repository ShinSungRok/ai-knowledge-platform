/**
 * Authorizes whether a principal may access a workspace.
 * Allows by returning; denies by throwing.
 */
export interface WorkspaceAuthorizer {
  authorize(input: {
    workspaceId: string;
    principalWorkspaceId: string;
  }): void;
}
