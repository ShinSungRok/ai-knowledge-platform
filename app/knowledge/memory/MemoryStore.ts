import type { MemoryEntry } from "./MemoryEntry";
import type { MemoryEntryRole } from "./MemoryEntryRole";

/**
 * Input for appending one memory entry to a workspace session.
 */
export interface MemoryAppendInput {
  workspaceId: string;
  sessionId: string;
  role: MemoryEntryRole;
  content: string;
}

/**
 * Port for workspace/session-scoped Agent Memory storage.
 *
 * Memory records conversational turns for Agent runs. It does **not**
 * replace Knowledge document/chunk/vector/hybrid search — those remain
 * separate capabilities under repository/retrieval/search.
 */
export interface MemoryStore {
  append(input: MemoryAppendInput): Promise<MemoryEntry>;
  listBySession(workspaceId: string, sessionId: string): Promise<MemoryEntry[]>;
}
