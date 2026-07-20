/**
 * Module: `app/knowledge/context`
 *
 * Prompt context assembly from retrieved documents.
 *
 * `ContextAssembler` (Task 31) is the port that turns a ranked
 * `RetrievedChunk[]` plus document provenance into a bounded,
 * deterministic `GroundingContext` for a downstream Prompt Builder /
 * Citation capability. `DefaultContextAssembler` (its default adapter) is
 * a later task.
 */
export const KNOWLEDGE_MODULE_CONTEXT = "app/knowledge/context" as const;

export type { ContextAssemblyInput } from "./ContextAssemblyInput";
export type { GroundingContextBlock, GroundingContext } from "./GroundingContext";
export type { ContextAssembler } from "./ContextAssembler";
