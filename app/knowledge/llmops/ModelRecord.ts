import type { ModelId } from "./ModelId";

/**
 * Workspace-scoped model identity (display name). Versions live in
 * {@link ModelVersionRecord}.
 */
export interface ModelRecord {
  id: ModelId;
  workspaceId: string;
  name: string;
}
