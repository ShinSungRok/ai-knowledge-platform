import type { MemoryEntryRole } from "./MemoryEntryRole";

/**
 * One turn of Agent session memory, scoped to a workspace and session.
 * `sequence` is the session-local append order (1-based). Memory is not
 * a Knowledge document/chunk/vector search substitute.
 */
export interface MemoryEntry {
  id: string;
  workspaceId: string;
  sessionId: string;
  role: MemoryEntryRole;
  content: string;
  sequence: number;
}
