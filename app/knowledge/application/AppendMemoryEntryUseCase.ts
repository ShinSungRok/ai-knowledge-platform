import type { MemoryStore } from "../memory/MemoryStore";
import type { MemoryEntry } from "../memory/MemoryEntry";
import type { MemoryEntryRole } from "../memory/MemoryEntryRole";

const VALID_ROLES: readonly MemoryEntryRole[] = ["user", "agent", "system"];

/**
 * Input for appending one memory entry at the application boundary.
 */
export interface AppendMemoryEntryInput {
  workspaceId: string;
  sessionId: string;
  role: MemoryEntryRole;
  content: string;
}

/**
 * Append-memory-entry use case: validate input at the application
 * boundary, then delegate to a {@link MemoryStore} port and return its
 * {@link MemoryEntry} unchanged.
 *
 * Depends only on the memory-store port — never on a concrete store
 * adapter or Knowledge search.
 */
export class AppendMemoryEntryUseCase {
  constructor(private readonly memoryStore: MemoryStore) {}

  async execute(input: AppendMemoryEntryInput): Promise<MemoryEntry> {
    const validated = this.toInput(input);

    return this.memoryStore.append({
      workspaceId: validated.workspaceId,
      sessionId: validated.sessionId,
      role: validated.role,
      content: validated.content,
    });
  }

  private toInput(input: AppendMemoryEntryInput): AppendMemoryEntryInput {
    if (!input || typeof input !== "object") {
      throw new Error("AppendMemoryEntryInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "AppendMemoryEntryInput.workspaceId must be a non-empty string",
      );
    }
    if (
      typeof input.sessionId !== "string" ||
      input.sessionId.trim().length === 0
    ) {
      throw new Error(
        "AppendMemoryEntryInput.sessionId must be a non-empty string",
      );
    }
    if (
      typeof input.role !== "string" ||
      !VALID_ROLES.includes(input.role as MemoryEntryRole)
    ) {
      throw new Error(
        'AppendMemoryEntryInput.role must be "user" | "agent" | "system"',
      );
    }
    if (typeof input.content !== "string" || input.content.trim().length === 0) {
      throw new Error(
        "AppendMemoryEntryInput.content must be a non-empty string",
      );
    }
    return {
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
    };
  }
}
