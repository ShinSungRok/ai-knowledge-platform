/**
 * Module: `app/knowledge/memory`
 *
 * Workspace/session-scoped Agent Memory — conversational turn storage
 * for Agent runs, separated from Knowledge document/chunk/vector search.
 *
 * Memory does **not** replace Knowledge retrieval or search. It records
 * and recalls session turns only. `MemoryEntryRole`, `MemoryEntry`, and
 * the `MemoryStore` port (Task 62) define the contract; concrete
 * adapters and application use cases are later tasks.
 */
export const KNOWLEDGE_MODULE_MEMORY = "app/knowledge/memory" as const;

export type { MemoryEntryRole } from "./MemoryEntryRole";
export type { MemoryEntry } from "./MemoryEntry";
export type { MemoryStore, MemoryAppendInput } from "./MemoryStore";
