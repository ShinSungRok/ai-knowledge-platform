/**
 * Role of a single conversational memory entry within a workspace
 * session. Distinct from Knowledge document authorship — Memory does
 * not store or retrieve knowledge documents/chunks.
 */
export type MemoryEntryRole = "user" | "agent" | "system";
