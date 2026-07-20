import type { ContextAssemblyInput } from "./ContextAssemblyInput";
import type { GroundingContext } from "./GroundingContext";

/**
 * Port for assembling ranked, retrieved chunks and their document
 * provenance into a bounded, deterministic {@link GroundingContext}.
 *
 * Implementations own document-provenance hydration and the
 * character-budget/truncation policy; concrete adapters live under
 * `app/knowledge/context` and are wired only at the composition root.
 */
export interface ContextAssembler {
  assemble(input: ContextAssemblyInput): Promise<GroundingContext>;
}
