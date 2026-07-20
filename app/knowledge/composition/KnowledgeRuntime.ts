import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";
import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";

/**
 * Runtime entrypoint exposed by the composition root for cited-answer
 * generation. Controllers and higher layers depend on this abstraction —
 * never on concrete adapters.
 */
export interface KnowledgeRuntime {
  readonly config: KnowledgeRuntimeConfig;
  generateCitedGroundedAnswer(input: {
    workspaceId: string;
    query: string;
    retrievalLimit?: number;
    maxCharacters?: number;
  }): Promise<CitedGroundedAnswer>;
}
