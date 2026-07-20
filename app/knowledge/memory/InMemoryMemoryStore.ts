import type { MemoryAppendInput } from "./MemoryStore";
import type { MemoryEntry } from "./MemoryEntry";
import type { MemoryEntryRole } from "./MemoryEntryRole";
import type { MemoryStore } from "./MemoryStore";

const VALID_ROLES: readonly MemoryEntryRole[] = ["user", "agent", "system"];

/**
 * In-memory {@link MemoryStore} adapter: workspace/session-scoped
 * conversational turn storage with deterministic ids and sequence
 * ordering.
 *
 * Does not import Knowledge document/chunk/vector search adapters —
 * Memory is a separate capability from Knowledge retrieval.
 */
export class InMemoryMemoryStore implements MemoryStore {
  private readonly entriesByWorkspace = new Map<
    string,
    Map<string, MemoryEntry[]>
  >();

  async append(input: MemoryAppendInput): Promise<MemoryEntry> {
    const validated = this.toAppendInput(input);
    const sessionEntries = this.getOrCreateSession(
      validated.workspaceId,
      validated.sessionId,
    );
    const sequence = sessionEntries.length + 1;
    const entry: MemoryEntry = {
      id: `${validated.workspaceId}:${validated.sessionId}:${sequence}`,
      workspaceId: validated.workspaceId,
      sessionId: validated.sessionId,
      role: validated.role,
      content: validated.content,
      sequence,
    };
    sessionEntries.push(this.clone(entry));
    return this.clone(entry);
  }

  async listBySession(
    workspaceId: string,
    sessionId: string,
  ): Promise<MemoryEntry[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(sessionId, "sessionId");
    const sessionEntries = this.entriesByWorkspace
      .get(workspaceId)
      ?.get(sessionId);
    if (!sessionEntries || sessionEntries.length === 0) {
      return [];
    }
    return sessionEntries
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((entry) => this.clone(entry));
  }

  private getOrCreateSession(
    workspaceId: string,
    sessionId: string,
  ): MemoryEntry[] {
    let workspace = this.entriesByWorkspace.get(workspaceId);
    if (!workspace) {
      workspace = new Map<string, MemoryEntry[]>();
      this.entriesByWorkspace.set(workspaceId, workspace);
    }
    let session = workspace.get(sessionId);
    if (!session) {
      session = [];
      workspace.set(sessionId, session);
    }
    return session;
  }

  private toAppendInput(input: MemoryAppendInput): MemoryAppendInput {
    if (!input || typeof input !== "object") {
      throw new Error("MemoryAppendInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    this.assertNonEmptyString(input.sessionId, "sessionId");
    this.assertNonEmptyString(input.content, "content");
    if (
      typeof input.role !== "string" ||
      !VALID_ROLES.includes(input.role as MemoryEntryRole)
    ) {
      throw new Error('MemoryAppendInput.role must be "user" | "agent" | "system"');
    }
    return {
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
    };
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${field} must be a non-empty string`);
    }
  }

  private clone(entry: MemoryEntry): MemoryEntry {
    return {
      id: entry.id,
      workspaceId: entry.workspaceId,
      sessionId: entry.sessionId,
      role: entry.role,
      content: entry.content,
      sequence: entry.sequence,
    };
  }
}
