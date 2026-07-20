import type { MemoryStore } from "../memory/MemoryStore";
import type { MemoryEntry } from "../memory/MemoryEntry";

/**
 * Input for recalling session memory entries at the application
 * boundary. Optional `limit` windows to the newest N entries while
 * preserving sequence-ascending order — a session memory window, not
 * a Knowledge search limit.
 */
export interface RecallMemoryEntriesInput {
  workspaceId: string;
  sessionId: string;
  limit?: number;
}

/**
 * Recall-memory-entries use case: validate input, list the session via
 * {@link MemoryStore}, then optionally keep only the newest `limit`
 * entries in sequence-ascending order.
 *
 * Depends only on the memory-store port — never on Knowledge search.
 */
export class RecallMemoryEntriesUseCase {
  constructor(private readonly memoryStore: MemoryStore) {}

  async execute(input: RecallMemoryEntriesInput): Promise<MemoryEntry[]> {
    const validated = this.toInput(input);
    const entries = await this.memoryStore.listBySession(
      validated.workspaceId,
      validated.sessionId,
    );

    if (validated.limit === undefined) {
      return entries;
    }

    if (entries.length <= validated.limit) {
      return entries;
    }

    return entries.slice(entries.length - validated.limit);
  }

  private toInput(input: RecallMemoryEntriesInput): RecallMemoryEntriesInput {
    if (!input || typeof input !== "object") {
      throw new Error("RecallMemoryEntriesInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "RecallMemoryEntriesInput.workspaceId must be a non-empty string",
      );
    }
    if (
      typeof input.sessionId !== "string" ||
      input.sessionId.trim().length === 0
    ) {
      throw new Error(
        "RecallMemoryEntriesInput.sessionId must be a non-empty string",
      );
    }
    if (input.limit !== undefined) {
      if (
        typeof input.limit !== "number" ||
        !Number.isInteger(input.limit) ||
        input.limit <= 0
      ) {
        throw new Error(
          "RecallMemoryEntriesInput.limit must be a positive integer",
        );
      }
    }
    return {
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    };
  }
}
